#include <WiFi.h>
#include <HTTPClient.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>
#include <MD5Builder.h>
#include <WiFiClientSecure.h>
#include "config.h"
#include <esp_wifi.h>



WiFiClientSecure client;


// Pin configurazione
const int COFFEE_RELAY_PIN = 15;    // Relè erogazione caffè 
const int PRESENCE_RELAY_PIN = 2;  // Relè corrente generale
const int RDM6300_RX_PIN = 22;
const int RDM6300_TX_PIN = 21;
const int SWITCH_PIN = 32;

const int LED_RED_PIN = 23;
const int LED_GREEN_PIN = 22;
const int LED_BLUE_PIN = 21;

bool userAuthorized = false;
String currentAuthorizedTag = "";
int currentCoffeeCount = 0;
bool coffeeInProgress = false;
int ledBlinkingCounter = 0;

// Variabili per il cooldown e timer presenza
unsigned long lastReadTime = 0;
unsigned long presenceStartTime = 0;
const unsigned long COOLDOWN_PERIOD = 5000;
const unsigned long PRESENCE_TIMEOUT = 300000; // 5 minuti 

// Variabile per lo stato dello switch
int lastSwitchState = HIGH;

// Variabile per il lampeggio del LED
unsigned long lastBlinkTime = 0;
const unsigned long BLINK_INTERVAL = 500; // 0.5 secondi
bool blinkState = false;
bool isBlinking = false;

IPAddress local_IP(130, 136, 201, 139);
IPAddress gateway(130, 136, 201, 190);
IPAddress subnet(255, 255, 255, 192);
IPAddress primaryDNS(1, 1, 1, 1);
SoftwareSerial rfidSerial(RDM6300_RX_PIN, RDM6300_TX_PIN);

String tagID = "";
const int TAG_LENGTH = 12;
bool isReading = false;

void setup() {
  Serial.begin(115200);
  rfidSerial.begin(9600);
  
  pinMode(COFFEE_RELAY_PIN, OUTPUT);
  pinMode(PRESENCE_RELAY_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_BLUE_PIN, OUTPUT);
  
  digitalWrite(COFFEE_RELAY_PIN, LOW);
  digitalWrite(PRESENCE_RELAY_PIN, LOW);
  
  pinMode(SWITCH_PIN, INPUT_PULLUP);
  

  setLEDColor(true, false, false);
  if (!WiFi.config(local_IP, gateway, subnet, primaryDNS)) {
    Serial.println("STA Failed to configure");
  }
  WiFi.begin(ssid, password);

  Serial.print("Connessione al WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnesso al WiFi");
  Serial.print("Indirizzo IP: ");
  Serial.println(WiFi.localIP());
  client.setInsecure();
  readMacAddress();
}

void readMacAddress(){
  uint8_t baseMac[6];
  esp_err_t ret = esp_wifi_get_mac(WIFI_IF_STA, baseMac);
  if (ret == ESP_OK) {
    Serial.printf("%02x:%02x:%02x:%02x:%02x:%02x\n",
                  baseMac[0], baseMac[1], baseMac[2],
                  baseMac[3], baseMac[4], baseMac[5]);
  } else {
    Serial.println("Failed to read MAC address");
  }
}
void setLEDColor(bool red, bool green, bool blue) {
  digitalWrite(LED_RED_PIN, red);
  digitalWrite(LED_GREEN_PIN, green);
  digitalWrite(LED_BLUE_PIN, blue);
}

void handleLEDBlink() {
  if (isBlinking ) {
    if (ledBlinkingCounter < 3) {
      blinkState = !blinkState;
      setLEDColor(blinkState, false, false);
      ledBlinkingCounter++;
      if(ledBlinkingCounter >= 3) {
        isBlinking = false;
        ledBlinkingCounter = 0;
      }
      delay(500);
    }
  }
}

void handlePresenceTimeout() {
    unsigned long currentTime = millis();
    if (currentTime - presenceStartTime >= PRESENCE_TIMEOUT) {
      userAuthorized=false;
      // Timeout scaduto, disattiva presenza
      digitalWrite(PRESENCE_RELAY_PIN, LOW);
      setLEDColor(true, false, false); // Rosso fisso
      Serial.println("Timeout presenza scaduto");
    }
  
}

bool checkTagWithServer(String tag) {
  if(WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String tagHash = hashTag(tag);
    Serial.println("tag: "+ tag);
    String url = String(serverUrl) + "?taghash=" + tagHash +"&tag="+tag;
    Serial.print("Richiesta a: ");
    Serial.println(url);
    
    http.begin(client,url);
    int httpResponseCode = http.GET();
    
    if (httpResponseCode == 200) {
      StaticJsonDocument<200> doc;
      deserializeJson(doc, http.getString());
      
      String status = doc["status"];
      currentCoffeeCount = doc["coffeeCount"];
      
      Serial.print("Caffè totali: ");
      Serial.println(currentCoffeeCount);
      
      http.end();
      return status == "authorized";
    } else {
      Serial.print("Errore HTTP: ");
      Serial.println(httpResponseCode);
      http.end();
      return false;
    }
  }
  Serial.println("WiFi non connesso");
  return false;
}

String hashTag(String tag) {
    MD5Builder md5;
    md5.begin();
    md5.add(tag);
    md5.calculate();
    return md5.toString();
}

void handleRFIDRead() {
  if (rfidSerial.available() > 0) {
    char c = rfidSerial.read();
    
    if (c == 0x02) {
      isReading = true;
      tagID = "";
    }
    else if (c == 0x03) {
      unsigned long currentTime = millis();
      presenceStartTime = currentTime; // Resetta il timer di presenza
      isReading = false;
      if (tagID.length() == TAG_LENGTH) {
        String tagHash = hashTag(tagID);
        if (currentTime - lastReadTime >= COOLDOWN_PERIOD) {
          if (checkTagWithServer(tagID)) {
            Serial.println("Utente autorizzato");
            userAuthorized = true;
            currentAuthorizedTag = tagHash;
            lastReadTime = currentTime;
            // Attiva relè presenza e LED verde
            digitalWrite(PRESENCE_RELAY_PIN, HIGH);
            setLEDColor(false, true, false);
            isBlinking = false;
            
          } else {
            Serial.println("Accesso negato");
            // Non modificare userAuthorized qui
            // Inizia lampeggio rosso
            isBlinking = true;
            lastBlinkTime = currentTime;
          }
        } else {
          Serial.println("In attesa del cooldown locale...");
        }
      }
      tagID = "";
    }
    else if (isReading) {
      tagID += c;
    }
  }
}

void incrementCoffeeCount() {
  unsigned long currentTime = millis();

  if (!currentAuthorizedTag.isEmpty()) {
    HTTPClient http;
    
    http.begin(client,incrementUrl);
    http.addHeader("Content-Type", "application/json");
    
    String jsonBody = "{\"tagId\":\"" + currentAuthorizedTag + "\"}";
    int httpResponseCode = http.POST(jsonBody);
    
    if (httpResponseCode == 200) {
      StaticJsonDocument<200> doc;
      deserializeJson(doc, http.getString());
      currentCoffeeCount = doc["coffeeCount"];
      Serial.print("Caffè totali per questo utente: ");
      Serial.println(currentCoffeeCount);
      presenceStartTime = currentTime; // Resetta il timer di presenza
    } else {
      Serial.print("Errore incremento caffè: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  }
}

void handleSwitch() {
  int switchState = digitalRead(SWITCH_PIN);
  
  if (switchState != lastSwitchState) {
    delay(50); 
    
    if (switchState == LOW) {  // Switch ON
      if (userAuthorized) {
        Serial.println("Switch ON - Erogazione caffè");
        digitalWrite(COFFEE_RELAY_PIN, HIGH);
        if (!coffeeInProgress) {
          incrementCoffeeCount();
          coffeeInProgress = true;
        }
      } else {
        Serial.println("Switch ON - Utente non autorizzato");
      }
    } else {  // Switch OFF
      Serial.println("Switch OFF - Disattivazione caffè");
      digitalWrite(COFFEE_RELAY_PIN, LOW);
      setLEDColor(true, false, false);
      userAuthorized=false;
      coffeeInProgress = false;
    }
    
    lastSwitchState = switchState;
  }
}

void loop() {
  handleRFIDRead();
  handleSwitch();
  handlePresenceTimeout();
  handleLEDBlink();
  delay(10);
}
