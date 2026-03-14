
import { FormField } from '@/app/actions';

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'faculty-meeting',
    title: 'Faculty Meeting Record',
    description: 'Record details for CR CT, PC CC, Committee, or Mentor meetings.',
    fields: [
      { id: '1', label: 'Meeting Type', type: 'select', required: true, options: ['CR CT Meeting', 'PC CC Meeting', 'Committee Meeting', 'Mentor Meeting'] },
      { id: '2', label: 'Academic Year', type: 'text', required: true },
      { id: '3', label: 'Specialization', type: 'text', required: false },
      { id: '4', label: 'Year', type: 'select', required: true, options: ['FY', 'SY', 'TY', 'Final Year'] },
      { id: '5', label: 'Panel', type: 'text', required: false },
      { id: '6', label: 'Date', type: 'text', required: true }, // Could be date picker if supported, else text
      { id: '7', label: 'Category', type: 'text', required: false },
      { id: '8', label: 'Title', type: 'text', required: true },
      { id: '9', label: 'MoM/Details/Points', type: 'textarea', required: true },
      { id: '10', label: 'Link to Upload/Document', type: 'text', required: false },
    ]
  },
  {
    id: 'cr-election',
    title: 'CR Election Data',
    description: 'Record details of Class Representative elections.',
    fields: [
      { id: '1', label: 'Academic Year', type: 'text', required: true },
      { id: '2', label: 'Specialization', type: 'text', required: false },
      { id: '3', label: 'Year', type: 'select', required: true, options: ['FY', 'SY', 'TY', 'Final Year'] },
      { id: '4', label: 'Panel', type: 'text', required: false },
      { id: '5', label: 'Date', type: 'text', required: true },
      { id: '6', label: 'Elected CR Name', type: 'text', required: true },
      { id: '7', label: 'Elected CR PRN', type: 'text', required: true },
      { id: '8', label: 'Elected CR Contact', type: 'text', required: true },
      { id: '9', label: 'Elected CR Email ID', type: 'text', required: true },
      { id: '10', label: 'Link to Proofs', type: 'text', required: false },
    ]
  },
  {
    id: 'project-seminar',
    title: 'Project/Seminar Information',
    description: 'Details about student projects and seminars.',
    fields: [
      { id: '1', label: 'Academic Year', type: 'text', required: true },
      { id: '2', label: 'Specialization', type: 'text', required: false },
      { id: '3', label: 'Year', type: 'select', required: true, options: ['FY', 'SY', 'TY', 'Final Year'] },
      { id: '4', label: 'Group Details/Student Details', type: 'textarea', required: true },
      { id: '5', label: 'Seminar/Capstone Title', type: 'text', required: true },
      { id: '6', label: 'Paper Published Link', type: 'text', required: false },
      { id: '7', label: 'Link to Synopsis', type: 'text', required: false },
      { id: '8', label: 'Link to Report', type: 'text', required: false },
      { id: '9', label: 'Link to Poster', type: 'text', required: false },
    ]
  },
  {
    id: 'events',
    title: 'Event Details',
    description: 'Record of events organized.',
    fields: [
      { id: '1', label: 'Academic Year', type: 'text', required: true },
      { id: '2', label: 'Specialization', type: 'text', required: false },
      { id: '3', label: 'Year', type: 'select', required: true, options: ['FY', 'SY', 'TY', 'Final Year'] },
      { id: '4', label: 'Event Details', type: 'textarea', required: true },
      { id: '5', label: 'Category', type: 'select', required: true, options: ['FDP', 'STTP', 'Guest Session', 'Workshop', 'Conference'] },
      { id: '6', label: 'Link to Report', type: 'text', required: false },
      { id: '7', label: 'Budget', type: 'number', required: false },
      { id: '8', label: 'Revenue', type: 'number', required: false },
      { id: '9', label: 'Duration', type: 'text', required: false },
      { id: '10', label: 'Date', type: 'text', required: true },
      { id: '11', label: 'SPOC Faculty', type: 'text', required: true },
      { id: '12', label: 'LinkedIn Post Link', type: 'text', required: false },
    ]
  },
  {
    id: 'club-event',
    title: 'Club Event Details',
    description: 'Record of club events.',
    fields: [
      { id: '1', label: 'Club Name', type: 'text', required: true },
      { id: '2', label: 'Year', type: 'select', required: true, options: ['FY', 'SY', 'TY', 'Final Year'] },
      { id: '3', label: 'Event Details', type: 'textarea', required: true },
      { id: '4', label: 'Category', type: 'select', required: true, options: ['FDP', 'STTP', 'Guest Session', 'Workshop', 'Conference'] },
      { id: '5', label: 'Link to Report', type: 'text', required: false },
      { id: '6', label: 'Budget', type: 'number', required: false },
      { id: '7', label: 'Revenue', type: 'number', required: false },
      { id: '8', label: 'Duration', type: 'text', required: false },
      { id: '9', label: 'Date', type: 'text', required: true },
      { id: '10', label: 'SPOC Faculty', type: 'text', required: true },
      { id: '11', label: 'LinkedIn Post Link', type: 'text', required: false },
    ]
  },
  {
    id: 'student-achievement',
    title: 'Student Achievement Details',
    description: 'Record of student achievements.',
    fields: [
      { id: '1', label: 'Year', type: 'select', required: true, options: ['FY', 'SY', 'TY', 'Final Year'] },
      { id: '2', label: 'Event Title (e.g., GATE, Firodiya, NPTEL)', type: 'text', required: true },
      { id: '3', label: 'Category', type: 'select', required: true, options: ['Sports', 'Academics', 'Extra Curricular', 'Solo', 'Team'] },
      { id: '4', label: 'PRN', type: 'text', required: true },
      { id: '5', label: 'Student Name', type: 'text', required: true },
      { id: '6', label: 'Achievement Type', type: 'select', required: true, options: ['Winner', 'Runner-up', 'Participation', 'Degree Awarded', 'Certificate Awarded'] },
      { id: '7', label: 'Class', type: 'select', required: true, options: ['SY', 'TY', 'Final Year'] },
      { id: '8', label: 'Panel', type: 'text', required: false },
      { id: '9', label: 'Link to Report/Evidence', type: 'text', required: false },
      { id: '10', label: 'Date of Event', type: 'text', required: true },
      { id: '11', label: 'LinkedIn Post Link', type: 'text', required: false },
    ]
  },
  {
    id: 'patent-copyright',
    title: 'Patent/Copyright Details',
    description: 'Record of patents or copyrights.',
    fields: [
      { id: '1', label: 'Year', type: 'select', required: true, options: ['FY', 'SY', 'TY', 'Final Year'] },
      { id: '2', label: 'Date', type: 'text', required: true },
      { id: '3', label: 'Category', type: 'select', required: true, options: ['Patent', 'Copyright'] },
      { id: '4', label: 'Status', type: 'select', required: true, options: ['Grant', 'Publish', 'File'] },
      { id: '5', label: 'PRN/ERP ID', type: 'text', required: true },
      { id: '6', label: 'Email', type: 'text', required: true },
      { id: '7', label: 'Contact', type: 'text', required: true },
      { id: '8', label: 'Name', type: 'text', required: true },
      { id: '9', label: 'Program/Class', type: 'select', required: true, options: ['SY', 'TY', 'Final Year', 'Program'] },
      { id: '10', label: 'Link to Evidence', type: 'text', required: false },
      { id: '11', label: 'SPOC Faculty/Student', type: 'text', required: true },
    ]
  },
  {
    id: 'startup',
    title: 'Startup Details',
    description: 'Record of student startups.',
    fields: [
      { id: '1', label: 'Academic Year', type: 'text', required: true },
      { id: '2', label: 'Establishment Date', type: 'text', required: true },
      { id: '3', label: 'Type', type: 'select', required: true, options: ['LLP', 'Private Limited', 'Proprietorship', 'Other'] },
      { id: '4', label: 'Status', type: 'text', required: true },
      { id: '5', label: 'PRN/ERP ID', type: 'text', required: true },
      { id: '6', label: 'Email', type: 'text', required: true },
      { id: '7', label: 'Contact', type: 'text', required: true },
      { id: '8', label: 'Student Name', type: 'text', required: true },
      { id: '9', label: 'Class', type: 'select', required: true, options: ['SY', 'TY', 'Final Year'] },
      { id: '10', label: 'Link to Evidence', type: 'text', required: false },
      { id: '11', label: 'Startup Website Link', type: 'text', required: false },
      { id: '12', label: 'SPOC Faculty/Student Name', type: 'text', required: true },
    ]
  }
];
