import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { buildAnalytics } from '../lib/analytics'
import { FORM_TEMPLATES, FormField } from '../lib/templates'

const prisma = new PrismaClient()

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomId(length = 22) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

function isoDateBetween(from: Date, to: Date) {
  const t = from.getTime() + Math.random() * (to.getTime() - from.getTime())
  const d = new Date(t)
  return d.toISOString().slice(0, 10)
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((n) => haystack.includes(n))
}

const firstNames = [
  'Aarav', 'Vivaan', 'Aditya', 'Ishaan', 'Krish', 'Atharv', 'Arjun', 'Sai', 'Reyansh', 'Vihaan',
  'Anaya', 'Diya', 'Myra', 'Kiara', 'Aadhya', 'Ira', 'Meera', 'Saanvi', 'Anika', 'Riya',
  'Tanvi', 'Shreya', 'Pranav', 'Om', 'Siddharth', 'Manas', 'Ved', 'Kabir', 'Aisha', 'Zoya',
]

const lastNames = [
  'Patil', 'Sharma', 'Kulkarni', 'Deshmukh', 'Joshi', 'Pawar', 'More', 'Jadhav', 'Kale', 'Ghadge',
  'Shinde', 'Chavan', 'Naik', 'Rao', 'Mishra', 'Yadav', 'Gupta', 'Patel', 'Verma', 'Singh',
  'Nair', 'Iyer', 'Bose', 'Khan', 'Shaikh', 'Kapoor', 'Mehta', 'Bhandari',
]

const specialisations = [
  'Artificial Intelligence & Machine Learning',
  'Data Science',
  'Cyber Security',
  'Cloud Computing',
  'Software Engineering',
  'IoT & Embedded Systems',
]

const clubNames = [
  'ACM Student Chapter',
  'IEEE Student Branch',
  'Data Science Club',
  'Robotics Society',
  'Coding Club',
  'Entrepreneurship Cell',
]

const companies = [
  'Tata Consultancy Services',
  'Infosys',
  'Wipro',
  'Accenture',
  'Capgemini',
  'Deloitte',
  'Amazon',
  'Microsoft',
  'Google',
  'Reliance Jio',
]

const domains = [
  'Backend Development',
  'Frontend Development',
  'Full-Stack Development',
  'Data Analytics',
  'Machine Learning',
  'Cloud Engineering',
  'Cyber Security',
  'DevOps',
]

const jobRoles = [
  'Software Engineer',
  'Associate Software Developer',
  'Data Analyst',
  'Machine Learning Engineer',
  'Cloud Support Engineer',
  'Security Analyst',
  'DevOps Engineer',
]

const facultyNames = [
  'Dr. Neha Kulkarni',
  'Prof. Rahul Joshi',
  'Dr. Priya Sharma',
  'Prof. Amit Patil',
  'Dr. Sneha Deshmukh',
  'Prof. Kunal Verma',
]

const projectTitles = [
  'Smart Attendance Using Face Recognition',
  'Predictive Maintenance for Industrial Motors',
  'Campus Navigation App with Indoor Mapping',
  'Phishing Detection Using NLP',
  'Personal Finance Tracker with Insights',
  'IoT-Based Smart Irrigation System',
]

const seminarTitles = [
  'Federated Learning for Privacy-Preserving AI',
  'Zero Trust Architecture in Enterprise Networks',
  'Edge AI for Real-Time Analytics',
  'Large Language Models in Education',
  'Green Cloud Computing Practices',
]

const eventTopics = [
  'Hands-on Workshop on Git and GitHub',
  'Guest Session on Industry Readiness',
  'FDP on Outcome Based Education',
  'STTP on Data Structures and Algorithms',
  'Workshop on Cloud Fundamentals',
]

const achievements = [
  'NPTEL Elite Certification in Programming, Data Structures and Algorithms',
  'GATE 2026 Qualified in CSE',
  'Winner at Inter-College Hackathon',
  'Runner-up at Firodiya Karandak (Tech Support Team)',
  'Sports: District-Level Badminton Participation',
]

const uploadFiles = [
  '/uploads/1774285421407_Hibban_Resume.pdf',
  '/uploads/1774284656884_Hibban_Resume__1_.pdf',
  '/uploads/1773643912936_Ojas_Deshpande_LoR.docx',
  '/uploads/1773644046744_Course_Feedback_Survey__Data_Structures.xlsx',
  '/uploads/1773645036429_1773644046744_Course_Feedback_Survey__Data_Structures.xlsx',
]

function buildStudentIdentity(index: number, formSlug: string) {
  const firstName = randomFrom(firstNames)
  const lastName = randomFrom(lastNames)
  const fullName = `${firstName} ${lastName}`
  const emailHandle = `${firstName}.${lastName}.${formSlug}.${index + 1}`.toLowerCase()
  const email = `${emailHandle}@college.edu`
  const roll = `CS${String(new Date().getFullYear()).slice(2)}${String(index + 1).padStart(3, '0')}`
  const prn = `${randomInt(2022000000, 2026999999)}`
  const phone = `9${randomInt(100000000, 999999999)}`
  return { fullName, email, roll, prn, phone }
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
}

function makeUrl(kind: 'doc' | 'report' | 'poster' | 'linkedin' | 'paper' | 'evidence') {
  if (kind === 'paper') return `https://doi.org/10.${randomInt(1000, 9999)}/${randomId(10)}`

  const topic = randomFrom([...eventTopics, ...projectTitles, ...seminarTitles])
  const date = isoDateBetween(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), new Date())
  const slug = slugify(topic)

  if (kind === 'linkedin') return `https://www.linkedin.com/posts/department-of-computer-engineering-${slug}-${date}`

  const ext = kind === 'poster' ? 'png' : 'pdf'
  return `https://college.edu/resources/${kind}/${slug}-${date}.${ext}`
}

function generateFieldValue(field: FormField, ctx: ReturnType<typeof buildStudentIdentity>) {
  const label = (field.label || '').toLowerCase()

  if (field.type === 'select' || field.type === 'radio') {
    if (field.options?.length) {
      if (includesAny(label, ['paper published'])) return Math.random() > 0.55 ? 'Yes' : 'No'
      return randomFrom(field.options)
    }
    return ''
  }

  if (field.type === 'checkbox') {
    const options = field.options ?? []
    if (options.length === 0) return []
    const selected = options.filter(() => Math.random() > 0.55)
    if (field.required && selected.length === 0) return [randomFrom(options)]
    return selected
  }

  if (field.type === 'number') {
    if (includesAny(label, ['budget'])) return randomInt(25000, 250000)
    if (includesAny(label, ['revenue'])) return randomInt(10000, 180000)
    if (includesAny(label, ['duration (weeks)', 'weeks'])) return randomInt(4, 12)
    return randomInt(1, 10)
  }

  if (field.type === 'file') {
    return randomFrom(uploadFiles)
  }

  if (includesAny(label, ['prn/erp', 'prn'])) return ctx.prn
  if (includesAny(label, ['email'])) return ctx.email
  if (includesAny(label, ['contact', 'phone', 'mobile'])) return ctx.phone
  if (includesAny(label, ['student name', 'name']) && !includesAny(label, ['startup website', 'club name'])) return ctx.fullName

  if (includesAny(label, ['academic year'])) return randomFrom(['2023-24', '2024-25', '2025-26'])
  if (includesAny(label, ['batch'])) return randomFrom(['2022-2026', '2021-2025', '2023-2027'])
  if (includesAny(label, ['specialisation', 'specialization'])) return randomFrom(specialisations)

  if (includesAny(label, ['establishment date', 'offer date', 'date of event', 'start date', 'end date', 'date'])) {
    const now = new Date()
    const from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    const to = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)
    return isoDateBetween(from, to)
  }

  if (includesAny(label, ['club name'])) return randomFrom(clubNames)
  if (includesAny(label, ['spoc faculty'])) return randomFrom(facultyNames)
  if (includesAny(label, ['spoc faculty/student'])) return Math.random() > 0.65 ? randomFrom(facultyNames) : ctx.fullName
  if (includesAny(label, ['spoc faculty/student name'])) return Math.random() > 0.7 ? randomFrom(facultyNames) : ctx.fullName
  if (includesAny(label, ['company/organization'])) return randomFrom(companies)
  if (includesAny(label, ['role/domain'])) return randomFrom(domains)
  if (includesAny(label, ['job role'])) return randomFrom(jobRoles)

  if (includesAny(label, ['package/ctc'])) return randomFrom(['₹7.5 LPA', '₹9.0 LPA', '₹10.5 LPA', '₹12.0 LPA', '₹14.5 LPA'])
  if (includesAny(label, ['stipend'])) return randomFrom(['₹8,000 per month', '₹12,000 per month', '₹15,000 per month', 'Unpaid', '₹20,000 per month'])
  if (includesAny(label, ['status']) && !includesAny(label, ['paper published'])) return randomFrom(['Ideation', 'MVP stage', 'Operational', 'Incorporated'])

  if (includesAny(label, ['linkedin'])) return makeUrl('linkedin')
  if (includesAny(label, ['paper published link'])) return makeUrl('paper')
  if (includesAny(label, ['link to synopsis'])) return makeUrl('doc')
  if (includesAny(label, ['link to report'])) return makeUrl('report')
  if (includesAny(label, ['link to poster'])) return makeUrl('poster')
  if (includesAny(label, ['link to proofs', 'link to evidence', 'link to report/evidence'])) return makeUrl('evidence')
  if (includesAny(label, ['startup website'])) {
    const lastName = ctx.fullName.split(' ').slice(-1)[0] || 'startup'
    const domain = slugify(`${lastName} ventures`)
    return `https://${domain}.in`
  }

  if (includesAny(label, ['duration']) && field.type === 'text') return randomFrom(['1 day', '2 days', '3 days', '1 week'])

  if (includesAny(label, ['event title'])) return randomFrom(achievements)
  if (includesAny(label, ['exam name'])) return randomFrom(['GATE CSE 2026', 'CAT 2025', 'GRE 2025', 'TOEFL 2025'])
  if (includesAny(label, ['score'])) return randomFrom(['Score 712, AIR 1843', 'Score 684, AIR 2560', 'Percentile 96.4', 'Score 318/340'])

  if (includesAny(label, ['project title'])) return randomFrom(projectTitles)
  if (includesAny(label, ['seminar/capstone title'])) return randomFrom([...projectTitles, ...seminarTitles])
  if (includesAny(label, ['title']) && !includesAny(label, ['linkedin', 'paper'])) return randomFrom([...eventTopics, ...seminarTitles, ...projectTitles])

  if (field.type === 'textarea') {
    if (includesAny(label, ['mom', 'details', 'points'])) {
      return [
        'Agenda: review progress, discuss action items, and confirm timelines.',
        'Key points: attendance update, course coverage status, and student feedback.',
        'Actions: share minutes with the group and close pending tasks by next week.',
      ].join('\n')
    }
    if (includesAny(label, ['event details'])) {
      return [
        `Topic: ${randomFrom(eventTopics)}`,
        `Participants: ${randomInt(35, 120)} students`,
        `Outcome: improved hands-on understanding and higher engagement in labs.`,
      ].join('\n')
    }
    if (includesAny(label, ['group details', 'student details'])) {
      const memberCount = randomInt(3, 4)
      const members = Array.from({ length: memberCount }, (_, i) => {
        const m = buildStudentIdentity(i + 10, 'grp')
        return `- ${m.fullName} (PRN: ${m.prn})`
      }).join('\n')
      return ['Group Members:', members].join('\n')
    }
    if (includesAny(label, ['keywords'])) {
      return randomFrom([
        'NLP, classification, feature engineering, evaluation metrics',
        'IoT, sensors, MQTT, real-time dashboard, edge computing',
        'Cloud, containers, CI/CD, monitoring, security',
        'Computer vision, embeddings, face recognition, attendance',
        'Graph algorithms, route planning, mobile UX, offline maps',
      ])
    }
    if (includesAny(label, ['abstract'])) {
      return [
        'This work presents a practical solution that addresses a common campus problem using modern tooling and best practices.',
        'The system is designed for reliability and ease of use, with clear modules for data collection, processing, and reporting.',
        'Evaluation focuses on usability, accuracy, and scalability with realistic constraints.',
      ].join(' ')
    }
    return randomFrom([
      'Well-structured response with relevant details and clear outcomes.',
      'Detailed information provided with supporting context and next steps.',
      'Concise summary focusing on key points and measurable results.',
    ])
  }

  if (includesAny(label, ['panel'])) return randomFrom(['Panel A', 'Panel B', 'Panel C', 'Honours Track'])
  if (includesAny(label, ['category']) && field.type === 'text') return randomFrom(['Academic', 'Administrative', 'Student Support', 'Research'])

  if (includesAny(label, ['meeting type'])) return 'Committee Meeting'

  if (field.type === 'text') {
    if (includesAny(label, ['event details'])) return randomFrom(eventTopics)
    if (includesAny(label, ['semester'])) return String(randomInt(1, 8))
    return randomFrom([
      'Submitted as per department guidelines.',
      'Confirmed with the coordinator and recorded for reference.',
      'Verified details and shared with concerned stakeholders.',
    ])
  }

  return ''
}

async function main() {
  const email = 'teacher@test.com'
  const password = await bcrypt.hash('password123', 10)

  const teacher = await prisma.teacher.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password,
      name: 'Test Teacher',
    },
  })
  console.log({ teacher })

  for (const template of FORM_TEMPLATES) {
    const existing = await prisma.form.findFirst({
      where: { teacherId: teacher.id, title: template.title },
    })

    const form = existing
      ? await prisma.form.update({
          where: { id: existing.id },
          data: {
            description: template.description,
            fields: JSON.stringify(template.fields),
            isActive: true,
          },
        })
      : await prisma.form.create({
          data: {
            title: template.title,
            description: template.description,
            fields: JSON.stringify(template.fields),
            teacherId: teacher.id,
            isActive: true,
          },
        })

    await prisma.formAnalytics.deleteMany({ where: { formId: form.id } })
    await prisma.submission.deleteMany({ where: { formId: form.id } })

    for (let i = 0; i < 50; i++) {
      const student = buildStudentIdentity(i, template.id.replace(/[^a-z0-9]+/gi, '').slice(0, 10) || 'form')
      const data: Record<string, unknown> = {}
      for (const field of template.fields) {
        const value = generateFieldValue(field, student)
        if (value === '' || (Array.isArray(value) && value.length === 0)) {
          if (field.required) {
            if (field.type === 'checkbox') data[field.id] = field.options?.length ? [randomFrom(field.options)] : []
            else if (field.type === 'number') data[field.id] = randomInt(1, 10)
            else if (field.type === 'file') data[field.id] = randomFrom(uploadFiles)
            else data[field.id] = generateFieldValue({ ...field, required: false }, student) || 'Provided as per records'
          } else if (Math.random() > 0.7) {
            data[field.id] = value
          }
        } else {
          data[field.id] = value
        }
      }

      const createdAt = new Date(Date.now() - randomInt(1, 120) * 24 * 60 * 60 * 1000)
      await prisma.submission.create({
        data: {
          formId: form.id,
          studentName: student.fullName,
          studentEmail: student.email,
          studentRoll: student.roll,
          data: data as any,
          createdAt,
        },
      })
    }

    const submissions = await prisma.submission.findMany({ where: { formId: form.id } })
    const analytics = buildAnalytics(template.fields as any, submissions as any)

    await prisma.formAnalytics.upsert({
      where: { formId: form.id },
      update: { data: analytics as any },
      create: {
        formId: form.id,
        data: analytics as any,
      },
    })

    console.log(`Seeded form: ${form.title} (${submissions.length} submissions)`)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
