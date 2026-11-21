import { redirect } from 'next/navigation';

export default function AdminHomePage(): never {
  redirect('/admin/dashboard');
}
