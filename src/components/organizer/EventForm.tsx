"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
export default function EventForm({ locale, mode, initialData }) {
  const router = useRouter();
  return <div>EventForm {mode} {locale}</div>;
}
