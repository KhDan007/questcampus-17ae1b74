"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "qc.applicantProfile.v1";

export type ApplicantProfile = {
  firstName?: string;
  lastName?: string;
  dob?: string;
  citizenship?: string;
  highSchool?: string;
  gpa?: string;
  testScores?: string;
  activities?: string;
};

export const PROFILE_FIELDS: Array<{
  key: keyof ApplicantProfile;
  label: string;
  question: string;
  helper: string;
  placeholder: string;
  multiline?: boolean;
  type?: "text" | "date";
}> = [
  {
    key: "firstName",
    label: "First name",
    question: "What's your first name?",
    helper: "We'll use this on every form.",
    placeholder: "Sofia",
  },
  {
    key: "lastName",
    label: "Last name",
    question: "And your last name?",
    helper: "Family name as on your passport.",
    placeholder: "Almeida",
  },
  {
    key: "dob",
    label: "Date of birth",
    question: "When were you born?",
    helper: "Required by most application portals.",
    placeholder: "",
    type: "date",
  },
  {
    key: "citizenship",
    label: "Citizenship",
    question: "What's your citizenship?",
    helper: "Used to flag visa and tuition requirements.",
    placeholder: "Portugal",
  },
  {
    key: "highSchool",
    label: "High school",
    question: "Which high school are you graduating from?",
    helper: "Full name as it appears on your transcript.",
    placeholder: "Lisbon International School",
  },
  {
    key: "gpa",
    label: "GPA",
    question: "What's your current GPA?",
    helper: "Use your school's scale — 4.0, 100, 20, etc.",
    placeholder: "3.8 / 4.0",
  },
  {
    key: "testScores",
    label: "Test scores",
    question: "Any standardized test scores?",
    helper: "SAT, ACT, IELTS, TOEFL — skip if none yet.",
    placeholder: "SAT 1480, TOEFL 108",
    multiline: true,
  },
  {
    key: "activities",
    label: "Activities",
    question: "Top activities or awards?",
    helper: "A few lines — we'll expand as needed per portal.",
    placeholder: "Debate captain, Math Olympiad silver, ...",
    multiline: true,
  },
];

function read(): ApplicantProfile {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ApplicantProfile) : {};
  } catch {
    return {};
  }
}

function write(p: ApplicantProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent("qc:applicant-profile-changed"));
  } catch {
    /* noop */
  }
}

export function useApplicantProfile() {
  const [profile, setProfile] = useState<ApplicantProfile>({});

  useEffect(() => {
    setProfile(read());
    const onChange = () => setProfile(read());
    window.addEventListener("qc:applicant-profile-changed", onChange);
    return () => window.removeEventListener("qc:applicant-profile-changed", onChange);
  }, []);

  const setField = useCallback(<K extends keyof ApplicantProfile>(k: K, v: ApplicantProfile[K]) => {
    const next = { ...read(), [k]: v };
    write(next);
  }, []);

  const missingCount = PROFILE_FIELDS.filter((f) => !profile[f.key]?.toString().trim()).length;
  const completion = Math.round(((PROFILE_FIELDS.length - missingCount) / PROFILE_FIELDS.length) * 100);

  return { profile, setField, missingCount, completion };
}
