# Sleepinglight - Defense Industry CEO

เกมเว็บแนวบริหารบริษัทอุตสาหกรรมป้องกันประเทศ เล่นผ่าน Browser ได้เลย ไม่ต้องติดตั้งฐานข้อมูล และพร้อมอัปขึ้น GitHub Pages

## สิ่งที่เพิ่มในเวอร์ชันนี้

- โหมดสนุก FUN+ กดปุ่ม 🎮 มุมขวาล่าง
- ภารกิจรายวัน
- Achievement / ถ้วยรางวัล
- เหตุการณ์สุ่มระหว่างเล่น
- โหมดท้าทาย Hardcore
- ระบบ XP / Level / Coins เสริม
- ระบบบันทึกข้อมูลเสริมด้วย LocalStorage
- เอฟเฟกต์แจ้งเตือน Combo และ Confetti
- ไฟล์ `.nojekyll` สำหรับ GitHub Pages
- ไฟล์ `package.json` สำหรับทดสอบแบบ local ได้ง่าย

## วิธีเปิดเล่นบนเครื่อง

วิธีง่ายสุด: เปิดไฟล์ `index.html` ด้วย browser

ถ้าต้องการเปิดแบบ local server:

```bash
python3 -m http.server 8000
```

แล้วเปิด:

```text
http://localhost:8000
```

## วิธีอัปขึ้น GitHub Pages แบบง่าย

1. เข้า GitHub แล้วสร้าง Repository ใหม่ เช่น `sleepinglight-game`
2. แตกไฟล์ ZIP นี้
3. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น Repository
4. ตรวจให้แน่ใจว่า `index.html` อยู่หน้าแรกสุดของ Repository ไม่ได้ซ้อนอยู่ในโฟลเดอร์อื่น
5. ไปที่ `Settings` > `Pages`
6. ตรง Source เลือก `Deploy from a branch`
7. เลือก Branch: `main` และ Folder: `/root`
8. กด Save แล้วรอ GitHub สร้างลิงก์เว็บ

## โครงสร้างไฟล์

```text
index.html
css/
  style.css
  funAddon.css
js/
  main.js
  funAddon.js
  ...ไฟล์ระบบเกมเดิม
assets/
README.md
.nojekyll
.gitignore
package.json
วิธีอัปขึ้น-GitHub.txt
วิธีการเล่น.txt
```

## ปุ่มลัดในโหมด FUN+

- `M` เปิด/ปิดแผงโหมดสนุก
- `R` เรียกเหตุการณ์สุ่ม
- `H` เปิดคู่มือ

## หมายเหตุ

เกมนี้เป็น static web app จึงเหมาะกับ GitHub Pages เพราะใช้ HTML, CSS และ JavaScript ฝั่งหน้าเว็บเท่านั้น
