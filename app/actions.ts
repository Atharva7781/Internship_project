'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildAnalytics } from "@/lib/analytics";

export type FieldType = 'text' | 'number' | 'checkbox' | 'radio' | 'select' | 'textarea';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // for select/radio
}

export async function createForm(prevState: unknown, formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return { success: false, message: 'Unauthorized' };
    }

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const fieldsJson = formData.get('fields') as string;

    if (!title) {
      return { success: false, message: 'Title is required' };
    }

    if (!fieldsJson) {
      return { success: false, message: 'Form fields are required' };
    }

    // Validate fields JSON
    let fields: FormField[] = [];
    try {
      fields = JSON.parse(fieldsJson);
      if (!Array.isArray(fields) || fields.length === 0) {
        return { success: false, message: 'At least one field is required' };
      }
    } catch {
      return { success: false, message: 'Invalid fields data' };
    }

    const newForm = await prisma.form.create({
      data: {
        title,
        description,
        fields: fieldsJson,
        teacherId: session.user.id,
      },
    });

    revalidatePath('/teacher-dashboard');
    return { success: true, formId: newForm.id, message: 'Form created successfully' };
  } catch (error) {
    console.error('Failed to create form:', error);
    return { success: false, message: 'Failed to create form' };
  }
}

export async function submitForm(formId: string, submissionData: Record<string, unknown>, studentDetails: { name: string; email: string; roll: string }) {
  try {
    if (!formId) return { success: false, message: 'Form ID is required' };
    if (!submissionData) return { success: false, message: 'Submission data is required' };
    if (!studentDetails || !studentDetails.name || !studentDetails.email || !studentDetails.roll) {
      return { success: false, message: 'Student details are required' };
    }

    await prisma.submission.create({
      data: {
        formId,
        data: submissionData as any,
        studentName: studentDetails.name,
        studentEmail: studentDetails.email,
        studentRoll: studentDetails.roll,
      },
    });

    const form = await prisma.form.findUnique({
      where: { id: formId },
    });

    if (form) {
      const fields = JSON.parse(form.fields);
      const submissions = await prisma.submission.findMany({
        where: { formId },
      });

      const analytics = buildAnalytics(fields, submissions);

      await prisma.formAnalytics.upsert({
        where: { formId },
        update: { data: analytics },
        create: {
          formId,
          data: analytics,
        },
      });
    }

    return { success: true, message: 'Form submitted successfully' };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, message: 'You have already submitted this form.' };
    }
    console.error('Failed to submit form:', error);
    return { success: false, message: 'Failed to submit form' };
  }
}

export async function getForm(formId: string) {
    try {
        const form = await prisma.form.findUnique({
            where: { id: formId }
        });
        return form;
    } catch (error) {
        console.error('Error fetching form', error);
        return null;
    }
}

export async function getTeacherForms() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];
  
  try {
    const forms = await prisma.form.findMany({
      where: { teacherId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: { 
        _count: { 
          select: { submissions: true } 
        } 
      }
    });
    return forms;
  } catch (error) {
    console.error('Error fetching teacher forms:', error);
    return [];
  }
}

export async function getTeacherHistory(
  search?: string, 
  status?: 'active' | 'inactive' | 'all',
  dateFrom?: string,
  dateTo?: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];
  
  try {
    const where: any = {
      teacherId: session.user.id,
    };

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    if (status && status !== 'all') {
      where.isActive = status === 'active';
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const forms = await prisma.form.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { 
        _count: { 
          select: { submissions: true } 
        } 
      }
    });
    return forms;
  } catch (error) {
    console.error('Error fetching teacher history:', error);
    return [];
  }
}

export async function toggleFormStatus(formId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, message: 'Unauthorized' };

  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
    });

    if (!form || form.teacherId !== session.user.id) {
      return { success: false, message: 'Form not found or unauthorized' };
    }

    await prisma.form.update({
      where: { id: formId },
      data: { isActive: !form.isActive },
    });

    revalidatePath('/teacher-dashboard/history');
    revalidatePath('/teacher-dashboard');
    revalidatePath(`/teacher-dashboard/forms/${formId}`);
    return { success: true, message: 'Form status updated' };
  } catch (error) {
    console.error('Error updating form status:', error);
    return { success: false, message: 'Failed to update form status' };
  }
}

export async function getFormDetails(formId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  try {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        submissions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!form || form.teacherId !== session.user.id) {
      return null;
    }

    return form;
  } catch (error) {
    console.error('Error fetching form details:', error);
    return null;
  }
}
