---
name: Hardware Hacking with Arduino
slug: hardware-hacking-arduino
description: Getting started with Arduino and embedded hardware — pins, resistors, serial communication, and blink circuits.
category: Hardware
version: 1.0.0
date: 2026-08-20
tags: [hardware, arduino, embedded, electronics, uart]
related: []
---
# Hardware Hacking with Arduino

A hands-on reference for starting with Arduino and embedded hardware. Useful when a task
involves talking to chips over UART, reading flash, or building your own test rig.

---

## 1. References

- Arduino simulator: <https://wokwi.com> (or simulator86) for testing code without hardware.
- Hardware hacking intro: HackTricks Hardware Hacking section.
- Arduino AVR core: `arduino/ArduinoCore-avr` on GitHub.

---

## 2. The Arduino Interface

- **Digital pins** — on/off outputs and digital inputs (e.g. pin 12, pin 13).
- **Power pins** — supply voltage (5V/3.3V) and GND.
- **Analog pins** — read varying voltages (A0-A5).

### Breadboard basics

- The `+` rail is the power supply.
- The `-` rail is the ground (GND).

### Resistors

Color bands tell you the value:

- **4 bands:** `1st, 2nd x 3rd = value` (e.g. red-red-brown = 220 ohms).
- **5 bands:** `1st, 2nd, 3rd x 4th = value`.
- Use a resistor color-code calculator (e.g. DigiKey) when unsure.

---

## 3. Serial Communication (UART basics)

`Serial.begin(9600)` starts serial communication at 9600 baud — the Arduino sends/receives
9600 bits per second. A **baud rate** is the communication speed between the Arduino and
another device (like your computer).

Common baud rates:

- 9600 (most common)
- 19200
- 38400
- 57600
- 115200 (faster, often used)

```cpp
void setup() {
  Serial.begin(9600);   // Start serial communication
}

void loop() {
  Serial.println("Hello!");
}
```

When probing real devices, the baud rate you see in firmware analysis tells you the UART
speed to use for console access.

---

## 4. Code Basics

### Variables

```cpp
int a = 5;
int b;

void setup(){
  a = 7 + 4;      // overwrite the previous integer a
  b = a + 4;
  Serial.begin(9600);
  Serial.println(b);
}
```

### Constants

`#define` declares a constant — unchanged throughout the program:

```cpp
#define LED_PIN 12   // Constant

void setup() {
  pinMode(LED_PIN, OUTPUT);
}
```

### Data types

| Type | Use | Notes |
|------|-----|-------|
| `int` | whole numbers | -32,768 to +32,767; overflows on big values |
| `long` | big integers | handles values over 2 billion |
| `double` | decimals | |
| `bool` | true/false | |
| `String` | text | |

---

## 5. Blink an LED (onboard)

```cpp
const int ledPin = 13;

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(ledPin, HIGH);   // LED ON
  Serial.println("LED is ON");
  delay(2000);                  // 2 seconds

  digitalWrite(ledPin, LOW);    // LED OFF
  Serial.println("LED is OFF");
  delay(1000);                  // 1 second
}
```

---

## 6. Blink with a Real Circuit

1. Jumper wire from Arduino **GND** to the breadboard **GND** rail.
2. Short (shorter) leg of the LED to GND; longer leg to any point on the board.
3. One leg of a **220 ohm resistor** to the LED's longer leg; the other leg to any point.
4. Second jumper wire from the resistor's other leg to **digital pin 12**.

```cpp
void setup() {
  pinMode(12, OUTPUT);
}

void loop() {
  digitalWrite(12, HIGH);
  delay(1000);                  // Wait for 1000 milliseconds
  digitalWrite(12, LOW);
  delay(1000);
}
```

---

## 7. Embedded Hacking Pointers

- Identify UART/console pads on a board by tracing the chip's TX/RX pins; hooking a logic
  analyzer or Arduino at the right baud often yields a root shell.
- The breadboard + resistor patterns above are the same skills needed to wire up glitching
  and serial-parse rigs safely.
- Only probe hardware you own or have permission to test.