import { Banknote, Smartphone, Landmark } from 'lucide-react';
import React from 'react';

export const NECK_TYPES = ['গোল গলা', 'ভি গলা', 'ক্রস ভি গলা', 'কলার', 'ভি কলার', 'পাঞ্জাবী কলার'];
export const FABRIC_TYPES = ['PP (170-180 GSM)', 'Sugar Mesh', 'Box Mesh', 'Honeycomb', 'Jacquard', 'Brush Jacquard'];
export const SIZES = ['M', 'L', 'XL', 'XXL', 'Free Size', 'Mixed'];

export const PAYMENT_METHODS = [
  { id: 'Cash', label: 'Cash (নগদ)', color: 'bg-emerald-600' },
  { id: 'Bkash', label: 'bKash', color: 'bg-[#e2136e]' },
  { id: 'Nagad', label: 'Nagad', color: 'bg-[#f7941d]' },
  { id: 'Rocket', label: 'Rocket', color: 'bg-[#8c3494]' },
  { id: 'Bank', label: 'Bank', color: 'bg-indigo-600' },
];

export const EXPENSE_CATEGORIES = ['Rent', 'Electricity', 'Transport', 'Salary', 'Marketing', 'Tea/Snacks', 'Other'];
