export type ProfileFieldKey =
  | "studentEnrollmentDate"
  | "studentLevel"
  | "musicianSection"
  | "musicianExperience"
  | "musicianDefaultVoice"
  | "musicianPlayedInstrumentId";

export type ProfileValidationInput = {
  isStudent: boolean;
  isMusician: boolean;
  student: {
    enrollmentDate: string;
    level: string;
  };
  musician: {
    section: string;
    experience: string;
    defaultVoice: string;
    playedInstrumentId: string;
  };
};

export function getMissingProfileFields(
  values: ProfileValidationInput,
): ProfileFieldKey[] {
  const missingFields: ProfileFieldKey[] = [];

  if (values.isStudent) {
    if (!values.student.enrollmentDate.trim())
      missingFields.push("studentEnrollmentDate");
    if (!values.student.level.trim()) missingFields.push("studentLevel");
  }

  if (values.isMusician) {
    if (!values.musician.section.trim()) missingFields.push("musicianSection");
    if (!values.musician.experience.trim())
      missingFields.push("musicianExperience");
    if (!values.musician.defaultVoice.trim())
      missingFields.push("musicianDefaultVoice");
    if (!values.musician.playedInstrumentId.trim())
      missingFields.push("musicianPlayedInstrumentId");
  }

  return missingFields;
}
