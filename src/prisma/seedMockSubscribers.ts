/**
 * Mock subscriber seeder — 50 demo KYC records
 * Run with:  npx tsx src/prisma/seedMockSubscribers.ts
 *
 * Distribution:
 *   Nationalities  : CN×8, IN×7, US×6, GB×5, DE×4, KE×4, NG×3, FR×3, ZA×3, AE×2, AU×2, other×3
 *   Purpose        : tourism×22, business×14, study×7, transit×4, medical×3
 *   Visa type      : Tourist×22, Business×14, Student×7, Transit×4, Medical×3
 *   Status spread  :
 *     - 28 active, comfortably within visa
 *     - 10 active, visa expiring within 7 days  (→ "notify" flag)
 *     - 7  active, visa within 24 h             (→ "ready to suspend")
 *     - 5  already suspended
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const today = new Date();
const d = (offsetDays: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + offsetDays);
  return dt;
};

type VisitPurpose = "tourism" | "business" | "study" | "transit" | "medical";
type Status = "active" | "suspended";

interface MockRecord {
  surname: string;
  otherNames: string;
  gender: string;
  nationalityCode: string;
  passportNumber: string;
  passportExpiry: Date;
  visaType: string;
  visaNumber: string;
  visaExpiryDate: Date;
  purposeOfVisit: VisitPurpose;
  entryPoint: string;
  arrivalDate: Date;
  intendedDurationDays: number;
  accommodation: string;
  status: Status;
}

const records: MockRecord[] = [
  // ── Active, visa well in future (28) ──────────────────────────────────────
  {
    surname: "Wang", otherNames: "Lei", gender: "M", nationalityCode: "CN",
    passportNumber: "G45821031", passportExpiry: d(1095),
    visaType: "Tourist", visaNumber: "TV-CN-001", visaExpiryDate: d(60),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-5), intendedDurationDays: 30, accommodation: "Serena Hotel Kampala",
    status: "active",
  },
  {
    surname: "Zhang", otherNames: "Wei", gender: "F", nationalityCode: "CN",
    passportNumber: "E73920184", passportExpiry: d(900),
    visaType: "Business", visaNumber: "BV-CN-002", visaExpiryDate: d(45),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-3), intendedDurationDays: 14, accommodation: "Kampala Sheraton",
    status: "active",
  },
  {
    surname: "Li", otherNames: "Jing", gender: "F", nationalityCode: "CN",
    passportNumber: "HG2930112", passportExpiry: d(720),
    visaType: "Tourist", visaNumber: "TV-CN-003", visaExpiryDate: d(55),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-10), intendedDurationDays: 21, accommodation: "Bwindi Impenetrable Lodge",
    status: "active",
  },
  {
    surname: "Chen", otherNames: "Xiao", gender: "M", nationalityCode: "CN",
    passportNumber: "P38201947", passportExpiry: d(800),
    visaType: "Business", visaNumber: "BV-CN-004", visaExpiryDate: d(40),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-8), intendedDurationDays: 10, accommodation: "Protea Hotel by Marriott",
    status: "active",
  },
  {
    surname: "Liu", otherNames: "Yang", gender: "M", nationalityCode: "CN",
    passportNumber: "K92018374", passportExpiry: d(600),
    visaType: "Tourist", visaNumber: "TV-CN-005", visaExpiryDate: d(50),
    purposeOfVisit: "tourism", entryPoint: "Katuna Border Post",
    arrivalDate: d(-12), intendedDurationDays: 30, accommodation: "Mweya Safari Lodge",
    status: "active",
  },
  {
    surname: "Sharma", otherNames: "Raj Kumar", gender: "M", nationalityCode: "IN",
    passportNumber: "N7439210A", passportExpiry: d(1200),
    visaType: "Business", visaNumber: "BV-IN-001", visaExpiryDate: d(90),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-2), intendedDurationDays: 30, accommodation: "Hotel Africana",
    status: "active",
  },
  {
    surname: "Patel", otherNames: "Priya", gender: "F", nationalityCode: "IN",
    passportNumber: "M8230194B", passportExpiry: d(1100),
    visaType: "Tourist", visaNumber: "TV-IN-002", visaExpiryDate: d(75),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-7), intendedDurationDays: 21, accommodation: "Kidepo Savannah Lodge",
    status: "active",
  },
  {
    surname: "Singh", otherNames: "Harpreet", gender: "M", nationalityCode: "IN",
    passportNumber: "L1029384C", passportExpiry: d(950),
    visaType: "Study", visaNumber: "SV-IN-001", visaExpiryDate: d(180),
    purposeOfVisit: "study", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-30), intendedDurationDays: 365, accommodation: "Makerere University Halls",
    status: "active",
  },
  {
    surname: "Kumar", otherNames: "Amit", gender: "M", nationalityCode: "IN",
    passportNumber: "K2938471D", passportExpiry: d(800),
    visaType: "Business", visaNumber: "BV-IN-003", visaExpiryDate: d(60),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-4), intendedDurationDays: 14, accommodation: "Kampala Serena Hotel",
    status: "active",
  },
  {
    surname: "Johnson", otherNames: "Michael", gender: "M", nationalityCode: "US",
    passportNumber: "543829100", passportExpiry: d(1500),
    visaType: "Tourist", visaNumber: "TV-US-001", visaExpiryDate: d(85),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-1), intendedDurationDays: 14, accommodation: "Gorilla Forest Camp",
    status: "active",
  },
  {
    surname: "Williams", otherNames: "Sarah", gender: "F", nationalityCode: "US",
    passportNumber: "629481022", passportExpiry: d(1300),
    visaType: "Business", visaNumber: "BV-US-002", visaExpiryDate: d(45),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-9), intendedDurationDays: 7, accommodation: "Fairway Hotel Kampala",
    status: "active",
  },
  {
    surname: "Davis", otherNames: "James", gender: "M", nationalityCode: "US",
    passportNumber: "738291004", passportExpiry: d(1100),
    visaType: "Tourist", visaNumber: "TV-US-003", visaExpiryDate: d(100),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-6), intendedDurationDays: 21, accommodation: "Chobe Safari Lodge",
    status: "active",
  },
  {
    surname: "Smith", otherNames: "Emily", gender: "F", nationalityCode: "GB",
    passportNumber: "829301047", passportExpiry: d(900),
    visaType: "Tourist", visaNumber: "TV-GB-001", visaExpiryDate: d(70),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-4), intendedDurationDays: 14, accommodation: "Uganda Wildlife Centre",
    status: "active",
  },
  {
    surname: "Jones", otherNames: "Oliver", gender: "M", nationalityCode: "GB",
    passportNumber: "930182048", passportExpiry: d(1000),
    visaType: "Business", visaNumber: "BV-GB-002", visaExpiryDate: d(55),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-11), intendedDurationDays: 7, accommodation: "Protea Hotel Kampala",
    status: "active",
  },
  {
    surname: "Müller", otherNames: "Hans", gender: "M", nationalityCode: "DE",
    passportNumber: "C39102847", passportExpiry: d(1100),
    visaType: "Tourist", visaNumber: "TV-DE-001", visaExpiryDate: d(65),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-3), intendedDurationDays: 14, accommodation: "Bwindi Gorilla Lodge",
    status: "active",
  },
  {
    surname: "Schmidt", otherNames: "Petra", gender: "F", nationalityCode: "DE",
    passportNumber: "D48201938", passportExpiry: d(950),
    visaType: "Medical", visaNumber: "MV-DE-001", visaExpiryDate: d(120),
    purposeOfVisit: "medical", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-15), intendedDurationDays: 60, accommodation: "Case Clinic Kampala",
    status: "active",
  },
  {
    surname: "Okonkwo", otherNames: "Chidi", gender: "M", nationalityCode: "NG",
    passportNumber: "A19283047", passportExpiry: d(700),
    visaType: "Business", visaNumber: "BV-NG-001", visaExpiryDate: d(90),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-2), intendedDurationDays: 30, accommodation: "Kampala Sheraton",
    status: "active",
  },
  {
    surname: "Dubois", otherNames: "Marie", gender: "F", nationalityCode: "FR",
    passportNumber: "09RP29183", passportExpiry: d(850),
    visaType: "Tourist", visaNumber: "TV-FR-001", visaExpiryDate: d(40),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-20), intendedDurationDays: 21, accommodation: "Ziwa Rhino Sanctuary",
    status: "active",
  },
  {
    surname: "Nkosi", otherNames: "Themba", gender: "M", nationalityCode: "ZA",
    passportNumber: "M48201947", passportExpiry: d(1000),
    visaType: "Business", visaNumber: "BV-ZA-001", visaExpiryDate: d(55),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-5), intendedDurationDays: 10, accommodation: "Hotel Equatoria Kampala",
    status: "active",
  },
  {
    surname: "Al Rashid", otherNames: "Khalid", gender: "M", nationalityCode: "AE",
    passportNumber: "A8293019Z", passportExpiry: d(1200),
    visaType: "Business", visaNumber: "BV-AE-001", visaExpiryDate: d(80),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-1), intendedDurationDays: 7, accommodation: "Kampala Serena Hotel",
    status: "active",
  },
  {
    surname: "Nguyen", otherNames: "Thi Lan", gender: "F", nationalityCode: "VN",
    passportNumber: "B93820104", passportExpiry: d(800),
    visaType: "Study", visaNumber: "SV-VN-001", visaExpiryDate: d(200),
    purposeOfVisit: "study", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-45), intendedDurationDays: 365, accommodation: "UCU Mukono Halls",
    status: "active",
  },
  {
    surname: "Tanaka", otherNames: "Hiroshi", gender: "M", nationalityCode: "JP",
    passportNumber: "TK9302847", passportExpiry: d(900),
    visaType: "Tourist", visaNumber: "TV-JP-001", visaExpiryDate: d(50),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-10), intendedDurationDays: 14, accommodation: "Clouds Mountain Gorilla Lodge",
    status: "active",
  },
  {
    surname: "Fernandez", otherNames: "Carlos", gender: "M", nationalityCode: "ES",
    passportNumber: "ES9201837", passportExpiry: d(750),
    visaType: "Transit", visaNumber: "TR-ES-001", visaExpiryDate: d(30),
    purposeOfVisit: "transit", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-1), intendedDurationDays: 2, accommodation: "Airport View Hotel",
    status: "active",
  },
  {
    surname: "Osei", otherNames: "Kwame", gender: "M", nationalityCode: "GH",
    passportNumber: "G10293847", passportExpiry: d(600),
    visaType: "Business", visaNumber: "BV-GH-001", visaExpiryDate: d(45),
    purposeOfVisit: "business", entryPoint: "Busia Border Post",
    arrivalDate: d(-7), intendedDurationDays: 14, accommodation: "Mbale Resort Hotel",
    status: "active",
  },
  {
    surname: "Kimura", otherNames: "Yuki", gender: "F", nationalityCode: "JP",
    passportNumber: "KM8302019", passportExpiry: d(1000),
    visaType: "Tourist", visaNumber: "TV-JP-002", visaExpiryDate: d(35),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-25), intendedDurationDays: 21, accommodation: "Primate Lodge Kibale",
    status: "active",
  },
  {
    surname: "Mensah", otherNames: "Abena", gender: "F", nationalityCode: "GH",
    passportNumber: "G92837401", passportExpiry: d(700),
    visaType: "Study", visaNumber: "SV-GH-001", visaExpiryDate: d(250),
    purposeOfVisit: "study", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-60), intendedDurationDays: 365, accommodation: "Makerere University Halls",
    status: "active",
  },
  {
    surname: "Volkov", otherNames: "Ivan", gender: "M", nationalityCode: "RU",
    passportNumber: "RU7382910", passportExpiry: d(800),
    visaType: "Business", visaNumber: "BV-RU-001", visaExpiryDate: d(42),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-8), intendedDurationDays: 14, accommodation: "Kampala Serena Hotel",
    status: "active",
  },
  {
    surname: "Ndlovu", otherNames: "Zanele", gender: "F", nationalityCode: "ZA",
    passportNumber: "M59201847", passportExpiry: d(900),
    visaType: "Tourist", visaNumber: "TV-ZA-002", visaExpiryDate: d(28),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-22), intendedDurationDays: 21, accommodation: "Lake Mburo Safari Lodge",
    status: "active",
  },

  // ── Active, visa expiring in 2–7 days  (notify band) ─────────────────────
  {
    surname: "Ito", otherNames: "Kenji", gender: "M", nationalityCode: "JP",
    passportNumber: "IT7302948", passportExpiry: d(500),
    visaType: "Tourist", visaNumber: "TV-JP-003", visaExpiryDate: d(7),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-23), intendedDurationDays: 30, accommodation: "Bwindi Impenetrable Lodge",
    status: "active",
  },
  {
    surname: "Liu", otherNames: "Fang", gender: "F", nationalityCode: "CN",
    passportNumber: "G10293048", passportExpiry: d(600),
    visaType: "Business", visaNumber: "BV-CN-006", visaExpiryDate: d(6),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-24), intendedDurationDays: 30, accommodation: "Hotel Africana",
    status: "active",
  },
  {
    surname: "Brown", otherNames: "David", gender: "M", nationalityCode: "US",
    passportNumber: "839201047", passportExpiry: d(1000),
    visaType: "Tourist", visaNumber: "TV-US-004", visaExpiryDate: d(5),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-25), intendedDurationDays: 30, accommodation: "Gorilla Forest Camp",
    status: "active",
  },
  {
    surname: "Taylor", otherNames: "Grace", gender: "F", nationalityCode: "GB",
    passportNumber: "948201038", passportExpiry: d(750),
    visaType: "Study", visaNumber: "SV-GB-001", visaExpiryDate: d(6),
    purposeOfVisit: "study", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-174), intendedDurationDays: 180, accommodation: "Uganda Christian University",
    status: "active",
  },
  {
    surname: "Fischer", otherNames: "Klaus", gender: "M", nationalityCode: "DE",
    passportNumber: "E92837410", passportExpiry: d(600),
    visaType: "Medical", visaNumber: "MV-DE-002", visaExpiryDate: d(5),
    purposeOfVisit: "medical", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-55), intendedDurationDays: 60, accommodation: "International Hospital Kampala",
    status: "active",
  },
  {
    surname: "Adeyemi", otherNames: "Funke", gender: "F", nationalityCode: "NG",
    passportNumber: "B29301847", passportExpiry: d(500),
    visaType: "Business", visaNumber: "BV-NG-002", visaExpiryDate: d(4),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-26), intendedDurationDays: 30, accommodation: "Protea Hotel Kampala",
    status: "active",
  },
  {
    surname: "Lefevre", otherNames: "Pierre", gender: "M", nationalityCode: "FR",
    passportNumber: "09FP38201", passportExpiry: d(700),
    visaType: "Transit", visaNumber: "TR-FR-001", visaExpiryDate: d(3),
    purposeOfVisit: "transit", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-2), intendedDurationDays: 3, accommodation: "Airport Guesthouse",
    status: "active",
  },
  {
    surname: "Wanjiku", otherNames: "Faith", gender: "F", nationalityCode: "KE",
    passportNumber: "K48201937", passportExpiry: d(400),
    visaType: "Business", visaNumber: "BV-KE-001", visaExpiryDate: d(5),
    purposeOfVisit: "business", entryPoint: "Malaba Border Post",
    arrivalDate: d(-25), intendedDurationDays: 30, accommodation: "Jinja Nile Resort",
    status: "active",
  },
  {
    surname: "Mwangi", otherNames: "Peter", gender: "M", nationalityCode: "KE",
    passportNumber: "K59302847", passportExpiry: d(500),
    visaType: "Tourist", visaNumber: "TV-KE-001", visaExpiryDate: d(6),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-24), intendedDurationDays: 30, accommodation: "Source of the Nile Hotel",
    status: "active",
  },
  {
    surname: "Park", otherNames: "Ji-ho", gender: "F", nationalityCode: "KR",
    passportNumber: "M39201847", passportExpiry: d(800),
    visaType: "Tourist", visaNumber: "TV-KR-001", visaExpiryDate: d(4),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-26), intendedDurationDays: 30, accommodation: "Murchison Falls Lodge",
    status: "active",
  },

  // ── Active, visa expiring within 24 h  (ready-to-suspend band) ───────────
  {
    surname: "Wang", otherNames: "Ming", gender: "M", nationalityCode: "CN",
    passportNumber: "H29301048", passportExpiry: d(400),
    visaType: "Tourist", visaNumber: "TV-CN-007", visaExpiryDate: d(0),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-30), intendedDurationDays: 30, accommodation: "Kabira Country Club",
    status: "active",
  },
  {
    surname: "Kumar", otherNames: "Suresh", gender: "M", nationalityCode: "IN",
    passportNumber: "J29301048", passportExpiry: d(300),
    visaType: "Business", visaNumber: "BV-IN-004", visaExpiryDate: d(0),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-30), intendedDurationDays: 30, accommodation: "Sheraton Kampala",
    status: "active",
  },
  {
    surname: "Kamau", otherNames: "John", gender: "M", nationalityCode: "KE",
    passportNumber: "K73920184", passportExpiry: d(200),
    visaType: "Tourist", visaNumber: "TV-KE-002", visaExpiryDate: d(0),
    purposeOfVisit: "tourism", entryPoint: "Busia Border Post",
    arrivalDate: d(-30), intendedDurationDays: 30, accommodation: "Sunset Hotel Jinja",
    status: "active",
  },
  {
    surname: "Martin", otherNames: "Sophie", gender: "F", nationalityCode: "FR",
    passportNumber: "09FM29301", passportExpiry: d(600),
    visaType: "Study", visaNumber: "SV-FR-001", visaExpiryDate: d(0),
    purposeOfVisit: "study", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-180), intendedDurationDays: 180, accommodation: "MUBS Hostel",
    status: "active",
  },
  {
    surname: "Robinson", otherNames: "Tom", gender: "M", nationalityCode: "AU",
    passportNumber: "PA9201938", passportExpiry: d(900),
    visaType: "Tourist", visaNumber: "TV-AU-001", visaExpiryDate: d(0),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-30), intendedDurationDays: 30, accommodation: "Wildwaters Lodge",
    status: "active",
  },
  {
    surname: "Ochieng", otherNames: "George", gender: "M", nationalityCode: "KE",
    passportNumber: "K82930147", passportExpiry: d(150),
    visaType: "Business", visaNumber: "BV-KE-002", visaExpiryDate: d(0),
    purposeOfVisit: "business", entryPoint: "Malaba Border Post",
    arrivalDate: d(-30), intendedDurationDays: 30, accommodation: "Hotel Triangle Tororo",
    status: "active",
  },
  {
    surname: "Weber", otherNames: "Anna", gender: "F", nationalityCode: "DE",
    passportNumber: "F18392047", passportExpiry: d(700),
    visaType: "Tourist", visaNumber: "TV-DE-003", visaExpiryDate: d(0),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-30), intendedDurationDays: 30, accommodation: "Volcanoes Safari Lodge",
    status: "active",
  },

  // ── Already suspended (5) ─────────────────────────────────────────────────
  {
    surname: "Hassan", otherNames: "Omar", gender: "M", nationalityCode: "EG",
    passportNumber: "A29301847", passportExpiry: d(100),
    visaType: "Tourist", visaNumber: "TV-EG-001", visaExpiryDate: d(-10),
    purposeOfVisit: "tourism", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-40), intendedDurationDays: 30, accommodation: "Kampala Backpackers",
    status: "suspended",
  },
  {
    surname: "Zhao", otherNames: "Ling", gender: "F", nationalityCode: "CN",
    passportNumber: "G83920147", passportExpiry: d(300),
    visaType: "Business", visaNumber: "BV-CN-008", visaExpiryDate: d(-7),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-37), intendedDurationDays: 30, accommodation: "Golf Course Hotel",
    status: "suspended",
  },
  {
    surname: "Owusu", otherNames: "Kwasi", gender: "M", nationalityCode: "GH",
    passportNumber: "G03920174", passportExpiry: d(200),
    visaType: "Transit", visaNumber: "TR-GH-001", visaExpiryDate: d(-5),
    purposeOfVisit: "transit", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-8), intendedDurationDays: 3, accommodation: "Airport Hotel Entebbe",
    status: "suspended",
  },
  {
    surname: "Rao", otherNames: "Deepa", gender: "F", nationalityCode: "IN",
    passportNumber: "L93820147", passportExpiry: d(100),
    visaType: "Study", visaNumber: "SV-IN-002", visaExpiryDate: d(-14),
    purposeOfVisit: "study", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-200), intendedDurationDays: 180, accommodation: "Kyambogo University Halls",
    status: "suspended",
  },
  {
    surname: "Diallo", otherNames: "Mamadou", gender: "M", nationalityCode: "SN",
    passportNumber: "SN9201837", passportExpiry: d(50),
    visaType: "Business", visaNumber: "BV-SN-001", visaExpiryDate: d(-3),
    purposeOfVisit: "business", entryPoint: "Entebbe International Airport",
    arrivalDate: d(-33), intendedDurationDays: 30, accommodation: "Fairway Hotel",
    status: "suspended",
  },
];

async function main() {
  console.log("Seeding 50 mock subscriber records…");

  for (const r of records) {
    const sub = await prisma.subscriber.create({
      data: {
        surname: r.surname,
        otherNames: r.otherNames,
        gender: r.gender,
        nationalityCode: r.nationalityCode,
        passportNumber: r.passportNumber,
        passportExpiry: r.passportExpiry,
        visaType: r.visaType,
        visaNumber: r.visaNumber,
        visaExpiryDate: r.visaExpiryDate,
        purposeOfVisit: r.purposeOfVisit,
        entryPoint: r.entryPoint,
        arrivalDate: r.arrivalDate,
        intendedDurationDays: r.intendedDurationDays,
        accommodation: r.accommodation,
        status: r.status,
      },
    });

    // Create suspension record for already-suspended subscribers
    if (r.status === "suspended") {
      await prisma.suspension.create({
        data: {
          subscriberId: sub.id,
          reason: "visa_expired",
          suspendedBy: "System (demo seed)",
        },
      });
    }
  }

  const counts = {
    active: records.filter((r) => r.status === "active").length,
    suspended: records.filter((r) => r.status === "suspended").length,
    expiringIn7d: records.filter((r) => r.status === "active" && r.visaExpiryDate <= d(7) && r.visaExpiryDate > d(0)).length,
    readyToSuspend: records.filter((r) => r.status === "active" && r.visaExpiryDate <= d(0)).length,
  };

  console.log(`✓ Seeded ${records.length} subscribers`);
  console.log(`  active: ${counts.active}  |  suspended: ${counts.suspended}`);
  console.log(`  expiring ≤7 days: ${counts.expiringIn7d}  |  ready-to-suspend (today): ${counts.readyToSuspend}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
