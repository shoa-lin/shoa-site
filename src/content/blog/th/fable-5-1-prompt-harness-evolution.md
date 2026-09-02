---
translationKey: "fable-5-1-prompt-harness-evolution"
locale: "th"
title: "จาก Fable 5 สู่ Fable 5.1: System Prompt กำลังพัฒนาเป็น Agent OS"
description: "เปรียบเทียบ Claude Runtime Prompt สองรุ่น วิเคราะห์การเปลี่ยนแปลงเชิงโครงสร้างของ Memory, Past Chats, Skills, การจัดเส้นทางเครื่องมือ และการกำกับดูแลความปลอดภัย พร้อมมองทิศทางถัดไปของ Agent Harness"
publishedAt: "2026-09-02"
updatedAt: "2026-09-02"
category: "architecture"
sourceLocale: "zh"
sourceUrl: "https://www.bydziwen.top/blog/fable-5-1-prompt-harness-evolution/"
sourceAuthor: "Shoa Lin"
contentType: "original"
translationStatus: "reviewed"
---

## สรุปก่อน

Anthropic เปิดตัว Claude Fable 5.1 เมื่อวันที่ 1 กันยายน 2026 การพูดคุยส่วนใหญ่มุ่งไปที่ความสามารถของโมเดล ราคา และผล Benchmark แต่สิ่งที่ผมสนใจมากกว่าคือวัสดุที่ดูไม่หวือหวา ทว่าบอกทิศทางของผลิตภัณฑ์ได้ชัดเจนกว่า นั่นคือ **System Prompt และ Runtime Prompt ที่ Claude ใช้เมื่อทำงานอยู่ในผลิตภัณฑ์จริง**

ผมเปรียบเทียบคลัง Full Runtime Prompt ของ Fable 5 ลงวันที่ 9 มิถุนายน 2026 กับ Snapshot ของ Fable 5.1 Runtime Prompt ที่ได้มาเมื่อวันที่ 2 กันยายน 2026 ชุดแรกมีประมาณ 1,580 บรรทัด ขนาด 126,943 ไบต์ ส่วนชุดหลังมี 2,195 บรรทัด ขนาด 275,723 ไบต์ จำนวนคำจำกัดความของเครื่องมือเพิ่มจาก 18 เป็น 44 รายการ

อย่างไรก็ตาม การเปลี่ยนแปลงนี้ไม่ควรถูกสรุปเพียงว่า “Prompt มีขนาดเพิ่มเป็นสองเท่า” เพราะพื้นที่จำนวนมากมาจาก Tool Schema ตัวอย่าง และคำอธิบาย Runtime Environment แบบไดนามิก **ความยาวไม่ใช่ความฉลาด และไม่ใช่ความสามารถของผลิตภัณฑ์โดยตรง** สิ่งสำคัญคือโครงสร้าง

> Fable 5 เป็น Agent ที่มี Tools, Skills, MCP และ Artifacts อยู่แล้ว ส่วน Fable 5.1 เริ่มจัดระเบียบ Memory, ประวัติการสนทนา, การค้นหาความสามารถ, การจัดเส้นทางผลลัพธ์, สิทธิ์ และการกำกับดูแลความปลอดภัยให้เป็น Agent Runtime ที่สมบูรณ์ขึ้น

กล่าวอีกอย่าง Harness รอบ Claude กำลังเปลี่ยนจาก “ติดเครื่องมือให้โมเดล” ไปสู่ “มอบระบบปฏิบัติการให้โมเดล”

## กำหนดขอบเขตการเปรียบเทียบให้ชัดเจนก่อน

บทความนี้ไม่ได้เปรียบเทียบ Weight ของโมเดล ข้อมูลฝึก หรือ Source Code ฝั่งเซิร์ฟเวอร์ของ Anthropic แต่เปรียบเทียบ **Snapshot ของ Prompt และ Runtime Configuration** สองชุดที่สังเกตได้

หน้า System Prompt ที่ Anthropic เปิดเผยต่อสาธารณะเน้นคำสั่งพฤติกรรมหลักที่ใช้บน claude.ai และแอปมือถือ ขณะที่ Full Runtime Snapshot ยังรวมคำจำกัดความของเครื่องมือที่เปิดใช้ใน Session นั้น Skills กฎของ Filesystem สิทธิ์เครือข่าย Placeholder ของ User Context และนโยบายการ Routing ภายในผลิตภัณฑ์ ผมจึงเรียกรวมชุดทั้งหมดนี้ว่า **Runtime Prompt Bundle**

การเปรียบเทียบนี้จึงช่วยให้เราเห็นได้ค่อนข้างชัดว่าผลิตภัณฑ์จัดวางความสามารถรอบโมเดลอย่างไร แต่ไม่สามารถใช้ Prompt เพียงอย่างเดียวสรุปได้ว่าความสามารถในการ Reasoning ของ Base Model เพิ่มขึ้นเท่าใด ความสามารถของโมเดลและความสามารถของ Harness ต้องประเมินแยกกัน

## ภาพรวมการเปลี่ยนแปลงสำคัญ

| มิติ | Fable 5 | Fable 5.1 | การเปลี่ยนแปลงเชิงโครงสร้าง |
| --- | --- | --- | --- |
| Memory | คำอธิบายสั้น ๆ ว่าเข้าถึง Memory ได้ | มีกฎครบด้านประเภทไฟล์ การสกัด การอ่านเขียน Version, Privacy และการนำไปใช้ | จากคำอธิบายฟีเจอร์สู่ Data Plane ที่มี Governance |
| Past Chats | ไม่มีชั้นค้นหาประวัติการสนทนาแยกต่างหาก | `conversation_search`, `recent_chats`, `read_conversation` | แยก Memory ที่บีบอัดออกจากหลักฐานต้นทาง |
| จำนวนเครื่องมือ | 18 คำจำกัดความ | 44 คำจำกัดความ | จาก Toolbox ทั่วไปสู่ Capability Interface ที่กว้างขึ้น |
| การขยายความสามารถ | Skills และ MCP Apps | Skills, Plugin Catalog และ MCP Apps | จากการกำหนดค่าแบบคงที่สู่การค้นหาและติดตั้ง |
| รูปแบบผลลัพธ์ | Text, Files, Artifacts, Maps และอื่น ๆ | เพิ่ม Charts, การ์ดเปรียบเทียบ, การ์ดขั้นตอน, Quiz, Translation, Products และ Links แบบมี Type | จาก String สู่ UI Type ที่ Routing ได้ |
| การ Routing ผลลัพธ์ | กระจายอยู่ในคำอธิบายเครื่องมือแต่ละตัว | ระบุลำดับความสำคัญระหว่าง MCP, File และ Visualizer | Harness เริ่มทำหน้าที่ Capability Router |
| การมองเห็นกระบวนการ | ไม่มีกฎทั่วไปเรื่อง Progress Update | ให้ Update สั้น ๆ ระหว่าง Tool Run ที่ยาว และส่งผลลัพธ์สุดท้ายให้ครบ | Product เริ่มกำกับประสบการณ์งานระยะยาวอย่างชัดเจน |
| รูปแบบการเขียน | กดการใช้ Lists, Headings และ Bold อย่างมาก | ใช้ Format ขั้นต่ำตามความซับซ้อนที่จำเป็น | ปรับ Prompt ให้สอดคล้องกับพฤติกรรมเริ่มต้นของโมเดลใหม่ |
| Search | มีข้อกำหนดให้ตรวจสอบข้อมูลที่เปลี่ยนตามเวลาอยู่แล้ว | Product, Model และ Tool ที่เปลี่ยนเร็วต้อง Search แม้โมเดลจะ “รู้จัก” | ความคุ้นเคยไม่ใช่หลักฐานว่าข้อมูลยังใหม่ |
| Safety และ Privacy | มีกฎด้านการปฏิเสธและ Wellbeing ค่อนข้างละเอียด | เพิ่ม Child Safety, ความต่อเนื่องของ Copyright, Memory Privacy, ความหมายของการลบ และกฎจบการสนทนา | จาก Output Filtering สู่ Lifecycle Governance |

## การเปลี่ยนแปลงที่ 1: Memory เติบโตจากคำอธิบายสองบรรทัดเป็น Filesystem

ส่วน Memory ของ Fable 5 บางมาก โดยบอกเพียงว่า Claude สามารถรับ Memory ที่สกัดจากการสนทนาในอดีต และระบุว่าผู้ใช้เปิดฟีเจอร์นี้หรือไม่ มันอธิบายว่า “มี Memory” แต่ไม่ได้กำหนดว่า Memory ถูกสร้าง อัปเดต ลบ หรือแบ่งประเภทอย่างไร

Fable 5.1 กลับจำลอง Memory เป็น Persistent Filesystem และแบ่งเนื้อหาอย่างน้อยห้าประเภท

- `/profile.md` สำหรับข้อมูลตัวตนและบทบาทที่ค่อนข้างคงที่
- `/topics/` สำหรับนิสัย ความชอบ และหัวข้อที่พูดถึงซ้ำ
- `/areas/` สำหรับ Project, ความรับผิดชอบ และ Decision ที่กำลังดำเนินอยู่
- `/people/` สำหรับ Relationship Context ที่เกี่ยวข้องกับคำถามปัจจุบัน
- `/preferences.md` สำหรับรูปแบบที่ผู้ใช้ต้องการให้ Claude ตอบและทำงานร่วมกัน

การออกแบบไม่ได้หยุดอยู่ที่ชื่อไฟล์ กฎใหม่ยังกำหนด Background Memory Pass, Provenance Label เช่น `[stated]`, Read-before-write, Version Conflict, Append เทียบกับ Replace, การ Delete ทั้งไฟล์, ขอบเขตของ Sensitive Data และเงื่อนไขว่า Memory ที่มีอยู่ควรถูกนำมาใช้ในคำตอบเมื่อใดหรือไม่ควรถูกกล่าวถึงเมื่อใด

```text
การสนทนาจบลง
   ↓
สกัด Durable Facts ใน Background
   ↓
จัดประเภท, ลบข้อมูลซ้ำ, Privacy Filter, Version Merge
   ↓
Persistent Memory Files
   ↓
ค้นคืนตามความเกี่ยวข้องเมื่อมีคำถามในอนาคต
   ↓
ใส่เฉพาะ Context ที่เปลี่ยนคำตอบอย่างมีนัยสำคัญ
```

นี่ไม่ใช่เพียง “ทำ Embedding ให้ประวัติการสนทนาแล้วดึง Top-K” แต่ใกล้เคียง **Context Database** ที่มี Schema, Provenance, Lifecycle และ Access Policy

ข้อสรุปของผมคือการแข่งขันด้าน Agent Memory จะเปลี่ยนจาก “จำได้หรือไม่” เป็น “จำอะไร เหตุใดจึงเชื่อถือได้ ใครแก้ไขได้ หมดอายุเมื่อใด และถอนออกได้อย่างไร” ส่วน Vector Retrieval เป็นเพียงรายละเอียดการนำไปใช้หนึ่งส่วนในระบบนี้

## การเปลี่ยนแปลงที่ 2: Past Chats และ Memory กลายเป็น Context Plane คนละชุด

Fable 5.1 เพิ่มเครื่องมือสำหรับประวัติการสนทนาโดยเฉพาะ ได้แก่ `conversation_search`, `recent_chats` และ `read_conversation` นี่ไม่ใช่แค่เพิ่มฟีเจอร์ Memory แต่เป็นการยอมรับในระดับ Architecture ว่าข้อมูลสองประเภทนี้มีธรรมชาติต่างกัน

- **Memory เก็บ Durable Claim ที่ถูกบีบอัด** เพื่อใช้ซ้ำได้เร็ว
- **Past Chats เก็บหลักฐานการสนทนาดั้งเดิม** เพื่อคืนบริบทและตรวจสอบที่มา

Prompt กำหนดชัดว่า Claude ต้องแยกสิ่งที่ผู้ใช้พูดหรือตัดสินใจจริงออกจากสิ่งที่ Claude เพียงเสนอ หากบทสนทนาเก่ามีเพียงข้อเสนอของ Assistant ระบบห้ามยกระดับเป็นการตัดสินใจของผู้ใช้ในบทสนทนาครั้งถัดไป และถ้าการสนทนาเดิมเป็นสมมติฐาน กระบวนการบีบอัดก็ห้ามเปลี่ยนสมมติฐานให้เป็นข้อเท็จจริง

นี่คือปัญหาหลักของระบบ Long-term Memory ทุกแบบ: **การบีบอัดเพิ่มความสะดวก แต่ทำให้หลักฐานหายไป**

โครงสร้างที่น่าเชื่อถือกว่าจึงไม่ควรใช้ Memory Store แบบครอบจักรวาลแก้ทุกงาน

```text
Memory = ข้อสรุปที่นำกลับมาใช้ได้
Past Chats = หลักฐานที่ตรวจสอบย้อนกลับได้
Current Session = Task State ที่กำลังเกิดขึ้นตอนนี้
```

Agent ที่เป็นผู้ใหญ่ต้องทำมากกว่าการ “จำ” มันต้องอธิบายได้ว่า Memory มาจากไหน ผู้ใช้เป็นผู้ระบุ Tool เป็นผู้ยืนยัน หรือ Model เป็นผู้อนุมาน

## การเปลี่ยนแปลงที่ 3: Skills, Plugins และ MCP สร้าง Capability Supply Chain

Fable 5 มี Skills และ MCP Apps อยู่แล้ว มันรู้ว่าควรอ่าน `SKILL.md` ที่เกี่ยวข้องก่อนสร้าง Document, Spreadsheet, Presentation หรือ Code Artifact และรู้ว่าควรใช้ MCP ที่เชื่อมต่อแล้วก่อนเมื่อเข้าถึงบริการภายนอก

Fable 5.1 รักษาโครงสร้างเดิมไว้และเพิ่ม Plugin Catalog กับ Skill Catalog ซึ่งมีเส้นทาง Search, Recommendation และ Installation ชั้น Capability ใหม่จึงมองได้ดังนี้

- **Skill** บรรจุประสบการณ์ กฎ และวิธีการของ Task Class หนึ่ง
- **Plugin** รวม Tools, Commands และ Skills เป็น Capability Bundle ที่แจกจ่ายได้
- **MCP** เชื่อม Data, System และ Authority ในโลกจริงจากภายนอก
- **Tool Schema** เปิด Action ที่ชัดเจนให้ Model
- **Router** ตัดสินว่า Capability Class ใดควรจัดการ Task ปัจจุบัน

การเพิ่มคำจำกัดความเครื่องมือจาก 18 เป็น 44 จึงไม่ใช่แค่ “มีฟังก์ชันเพิ่ม 26 ตัว” เครื่องมือใหม่กระจุกตัวใน Memory CRUD, Past Chat Retrieval, Plugin/Skill Discovery, Research Suggestion และ Structured UI เช่น Charts, Comparison, Steps, Translation, Quiz, Products และ Links

ภาพนี้คล้าย Software Layering แบบดั้งเดิมมากขึ้น Model ไม่จำเป็นต้องเก็บทุกวิธีทำงานไว้ถาวร และไม่ควรถือทุกสิทธิ์ภายนอกโดยตรง Capability สามารถถูก Discovery, Load, Authorization, Invocation และ Removal ได้

## การเปลี่ยนแปลงที่ 4: Prompt เริ่มชดเชยพฤติกรรมของ Model แบบย้อนกลับ

Prompt ของ Fable 5 กดการใช้ Headings, Lists และ Bold อย่างมาก เพราะ Model ในเวลานั้นมักสร้างคำตอบที่มี Format มากเกินไปและดูเหมือน Template ส่วน Fable 5.1 ผ่อนกฎนี้ โดยอนุญาตให้ใช้ List เมื่อเนื้อหาซับซ้อน และใช้เพียง Format ขั้นต่ำที่ช่วยให้ชัดเจน

นี่ไม่ใช่เพียงรสนิยมผลิตภัณฑ์ที่เปลี่ยนไป แต่พฤติกรรมเริ่มต้นของ Model เปลี่ยนแล้ว Anthropic ระบุใน Fable 5.1 Prompting Guide ว่า Model ใหม่มีแนวโน้มใช้ Headings, Lists และ Bold น้อยกว่า Fable 5 หากยังเก็บ Anti-formatting Prompt เดิมไว้ ผลลัพธ์อาจกลายเป็นย่อหน้ายาวแน่นเกินไป

ความสัมพันธ์แบบชดเชยเดียวกันปรากฏอีกสองจุด

- Fable 5.1 ให้ Progress Update เองน้อยลงใน Tool Chain ที่ยาว Prompt ใหม่จึงขอ Update สั้น ๆ ทุกสองสาม Tool Calls
- เมื่อใช้ Effort ต่ำ Fable 5.1 มีแนวโน้มตอบจากความรู้เดิมแทนการ Search Prompt ใหม่จึงเพิ่มความเข้มในการตรวจสอบ Product, Model และ Tool ที่เปลี่ยนเร็ว

บทเรียนสำคัญต่อ Prompt Engineering คือ **System Prompt ไม่ใช่ Product Specification ที่เขียนครั้งเดียวแล้วจบ แต่เป็น Controller ของ Model Behavior** เมื่อ Model เปลี่ยน Prompt เดิมอาจยังทำงานได้ แต่ชดเชยมากเกินจนทำให้ Model ใหม่แย่ลง

ทีมที่มีวุฒิภาวะจะไม่ใช้ “Universal Prompt” ชุดเดียวกับทุก Model แต่จะใช้ Eval สังเกต Failure Mode แล้วปรับเท่าที่จำเป็นสำหรับ Model ปัจจุบัน

## การเปลี่ยนแปลงที่ 5: Safety เปลี่ยนจาก “ตอบอะไรได้” สู่ State และ Data Governance

Fable 5 มี Safety Policy ที่กว้างอยู่แล้ว การเปลี่ยนแปลงสำคัญของ Fable 5.1 ไม่ใช่เพียงเพิ่มรายการต้องห้าม แต่คือการขยาย Safety Rule ให้ครอบคลุม Interaction Lifecycle ทั้งหมด

Prompt ใหม่จัดการว่าคำขอถัดไปสืบทอด State อย่างไรหลังการปฏิเสธ ขอบเขต Copyright ยังคงอยู่หรือไม่เมื่อคำขอถูกย่อหรือเขียนใหม่ ข้อมูลใดห้ามเข้าสู่ Long-term Memory โดยเด็ดขาด การลบ Memory หนึ่งรายการต้องลบข้อสรุปที่อนุมานจากข้อมูลนั้นเพียงอย่างเดียวหรือไม่ Sensitive Memory อ่านได้เมื่อใด คำขอจบการสนทนาต้องยืนยันอย่างไร และระบบสามารถจบการสนทนาได้หรือไม่เมื่อมี Abuse, Self-harm Risk หรือ Potential Violence

กฎเหล่านี้ควบคุมมากกว่า Final Text

- Data สามารถถูกเก็บได้หรือไม่
- ควรติด Provenance Label ใด
- นำกลับมาใช้ภายหลังได้หรือไม่
- ผู้ใช้ถอนข้อมูลได้หรือไม่
- Tool Side Effect ถูกจำกัดอย่างไร
- Conversation State เปลี่ยน Decision ถัดไปอย่างไร

ดังนั้น Safety กำลังพัฒนาจาก Classifier รอบ Answer ไปเป็น Policy Engine ภายใน Agent Runtime

## สิ่งที่ไม่ได้เปลี่ยนในระดับพื้นฐาน

เพื่อไม่เรียกทุกอย่างว่าเป็นการปฏิวัติ เราควรมองด้วยว่า Fable 5 มีอะไรอยู่แล้ว

Fable 5 มี Persistent Artifact Storage, MCP Connectors, Skills, File Creation, Computer Use, Web Search, Image Search และ Typed Map Output อยู่ก่อนแล้ว มันไม่ใช่ Text-only Chatbot และ Fable 5.1 ก็ไม่ได้คิดค้น Agent ขึ้นจากศูนย์

การอัปเกรดจริงคือ Fable 5.1 มอบ Context Category, Evidence Recovery, Capability Catalog, Output Routing, Process Feedback และ Governance Rule ที่ชัดเจนขึ้นให้ Component เดิม

ดังนั้นการเปลี่ยนผ่านนี้ควรเข้าใจว่าเป็นการไปจาก “มี Component จำนวนมาก” สู่ “Component มีขอบเขตความรับผิดชอบแบบระบบปฏิบัติการ”

## สรุปของผม: สี่ Plane กำลังก่อตัว

หากสรุปการเปลี่ยนแปลงนี้ในเชิงนามธรรม ผมคิดว่า Claude Runtime สามารถอธิบายเป็นสี่ Plane ได้

```text
Instruction Plane
System Prompt / Turn Instruction / User Preference / Skill

Context Plane
Current Session / Memory / Past Chats / Files / Web

Capability Plane
Tools / Plugins / MCP / Computer / Typed UI

State & Governance Plane
Provenance / Version / Permission / Safety / Audit
```

Fable 5 เน้นขยาย Capability เป็นหลัก ส่วน Fable 5.1 เริ่มลงทุนอย่างจริงจังใน Context และ State Governance

ตอนนี้ผมมอง Agent Product ผ่านสูตรนี้มากกว่า

> **Agent Product Capability = Model × Context × Capability × State Governance**

นี่เป็นการคูณ ไม่ใช่การบวก Model ที่แข็งแรงแต่ Context ผิดก็ยังล้มเหลว Product ที่มี Tools มากแต่ควบคุม Permission ไม่ได้ก็เข้า Enterprise ไม่ได้ Memory ที่อุดมแต่ไม่มี Provenance และ Delete Mechanism จะสะสมมลพิษ Workflow ที่ครบแต่ไม่มี Feedback ที่ตรวจสอบได้เพียงทำให้ Agent ทำผิดได้อัตโนมัติมากขึ้น

## ทิศทางต่อไปจะเป็นอย่างไร

### 1. Monolithic System Prompt จะแยกเป็น Modular Policy

วันนี้เรายังอ่าน Runtime Prompt Bundle ที่ยาวกว่าสองพันบรรทัดได้ แต่กฎจำนวนมากไม่ควรถูกฉีดเข้า Model เป็น Natural Language ตลอดไป มันจะค่อย ๆ ย้ายไปสู่ Versioned Policy, Skills, Routers, Permission Settings และ Task-scoped Instructions

Prompt จะไม่หายไป แต่จะถอยจาก “ข้อความที่บรรทุกทุกกฎ” มาเป็น “Interface ที่ช่วยให้ Model เข้าใจ Goal และ Boundary ปัจจุบัน”

### 2. Context Engineering จะกลายเป็น State Engineering

คำถามในอดีตคือจะใส่ Context เพิ่มใน Window ได้อย่างไร คำถามที่สำคัญกว่าต่อไปคือใครเป็นเจ้าของ State, Version ใดเป็นปัจจุบัน, Fact ใดหมดอายุ, Rollback อย่างไร และพิสูจน์ได้อย่างไรว่า External Action เกิดขึ้นจริง

Memory, Past Chats, Session, Tool Trace และ External System State จะถูก Model แยกกัน Context ของ Agent จะเหมือน Database และ Event Stream มากกว่า Prompt ที่ยาวขึ้นเรื่อย ๆ

### 3. ข้อจำกัดมากขึ้นจะย้ายจาก Prompt ลงสู่ Protocol Layer

Fable 5.1 เปิดตัว Turn-scoped System Message, Thinking Block Binding, Content Provenance และ Per-message Effort พร้อมกัน สิ่งเหล่านี้ชี้ไปในทิศทางเดียวกัน: ข้อจำกัดสำคัญเริ่มถูกแสดงโดย API และ Runtime โดยตรง แทนที่จะพึ่งให้ Model “จำกฎ”

สิ่งใดที่รับประกันได้ด้วย Type System, Permission System, Version Number หรือ Protocol สุดท้ายไม่ควรมีอยู่เพียงใน Prompt Text

### 4. ผลลัพธ์ของ Agent จะเป็น Typed Result แทน Text

ในบรรดาเครื่องมือใหม่ของ 44 Tools มีจำนวนมากที่ไม่ใช่ Action Tool แต่เป็น Output Component สำหรับ Charts, Cards, Steps, Quiz, Translation และ Product Lists ผลงานสุดท้ายของ Model กำลังเปลี่ยนจาก Markdown String เป็น Typed Result ที่ Application ใช้ต่อได้โดยตรง

Frontend ในอนาคตจะไม่เพียง Render Answer แต่เลือก Interactive UI ตาม Result Type และเปลี่ยน User Interaction ถัดไปเป็น State ของ Turn ต่อไป

### 5. Model และ Harness จะถูก Training และ Iteration ร่วมกัน

แนวโน้มระยะยาวที่สำคัญที่สุดคือ Model และ Harness จะไม่ใช่ผลิตภัณฑ์อิสระจากกัน Post-training จะปรับ Model ให้เข้ากับ Tool Protocol, Progress Reporting, Editing Pattern, Memory Structure และ Permission Boundary เฉพาะ ส่วน Harness จะปรับ Prompt, Router และ Eval ตาม Failure Mode ของ Model รุ่นใหม่

การกลับทิศของ Formatting Guidance จาก Fable 5 สู่ Fable 5.1 เป็นตัวอย่างเล็กแต่ชัด เมื่อพฤติกรรมเริ่มต้นของ Model เปลี่ยน Control รอบข้างก็ต้องเปลี่ยนตาม

การแข่งขันสุดท้ายจะไม่ได้ตัดสินเพียงว่าใครมี Base Model ที่แข็งแรงที่สุด แต่ใครมี Real Environment ที่สมบูรณ์กว่า Task Trajectory ที่มีคุณภาพกว่า Feedback Signal ที่น่าเชื่อถือกว่า และ Closed Loop ที่ส่งสัญญาณเหล่านี้กลับไปพัฒนาทั้ง Model และ Harness

## สิ่งนี้หมายถึงอะไรสำหรับผู้สร้าง Agent

ข้อแรก อย่าสับสน System Prompt กับ Product Architecture Prompt อธิบาย Boundary ได้ แต่ Boundary ที่เชื่อถือได้ต้องอาศัย Permission, Schema, Version, Idempotency, Audit และ Eval

ข้อสอง อย่าลด Memory ให้เหลือ Vector Database เพราะ Long-term Memory เป็นปัญหา Data Governance ก่อน แล้วจึงเป็นปัญหา Retrieval

ข้อสาม อย่าประเมินเฉพาะ Final Answer สำหรับ Tool-using Agent สิ่งสำคัญกว่าคือ Trajectory ถูกต้องหรือไม่ Side Effect ถูกควบคุมหรือไม่ Failure ฟื้นตัวได้หรือไม่ และ Evidence ตรวจสอบย้อนกลับได้หรือไม่

ข้อสี่ อย่าคิดว่าเปลี่ยน Model แล้ว Harness เดิมจะดีขึ้นอัตโนมัติ ทุก Model Upgrade ควรรัน Real-task Eval ใหม่ และตรวจ Drift ของ Search, Parallel Tool Use, File Editing, Formatting, Stopping Condition และ Progress Reporting

## บทส่งท้าย

สิ่งที่เปิดเผยที่สุดในการเปลี่ยน Prompt ของ Fable 5.1 ไม่ใช่จำนวนกฎที่เพิ่ม แต่คือ Anthropic เริ่มตอบคำถามที่ Agent Product ทุกตัวต้องเจออย่างเป็นระบบมากขึ้น: Context มาจากไหน Capability ถูก Load อย่างไร State ดำเนินต่ออย่างไร Side Effect ถูกกำกับอย่างไร Result ถูกนำเสนออย่างไร และ Error ถูกแก้อย่างไร

ข้อสรุปสุดท้ายของผมคือ

> การแข่งขันของ Agent รุ่นถัดไปจะไม่ใช่ใครมี Prompt ยาวกว่า แต่คือใครสามารถวาง Model ไว้ใน Environment ที่เป็นจริงกว่า มี State มากกว่า ตรวจสอบได้มากกว่า และเรียนรู้ต่อเนื่องได้

เมื่อ Environment Capability เหล่านี้เสถียรขึ้น System Prompt อาจกลับมาสั้นลง เพราะกฎที่เชื่อถือได้ที่สุดจะพัฒนาจาก “บอก Model ว่าควรทำอย่างไร” เป็น “System อนุญาตให้ทำได้เฉพาะวิธีที่ถูกต้อง”

## เอกสารอ้างอิง

- [Anthropic: System prompts overview](https://platform.claude.com/docs/en/release-notes/system-prompts/overview)
- [Anthropic: Claude Fable 5 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5)
- [Anthropic: Claude Fable 5.1 System Prompt](https://platform.claude.com/docs/en/release-notes/system-prompts/claude-fable-5-1)
- [Anthropic: Claude Fable 5.1 model overview](https://platform.claude.com/docs/en/models/fable-5-1/overview)
- [Anthropic: Prompting Claude Fable 5.1](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1)
- [Community Archive ของ Full Fable 5 Runtime Prompt](https://github.com/infineural/fable-5/blob/main/system-prompt/full-system-prompt.md)
