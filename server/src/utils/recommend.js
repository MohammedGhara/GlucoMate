// utils/recommend.js
export function recommend({ glucose, takenAt }) {
  if (glucose >= 250) return "מדידה גבוהה מאוד. אם יש תסמינים — פנה לטיפול.";
  if (glucose >= 180) return "גבוה לאחר אוכל – שתה מים, בדוק שוב בעוד שעתיים.";
  if (glucose < 70)   return "היפוגליקמיה — טפל בסוכר מהיר ובדוק שוב תוך 15 דק'.";
  return "בטווח כללי. המשך מעקב.";
}
