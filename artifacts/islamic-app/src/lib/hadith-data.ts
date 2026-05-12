export interface Hadith {
  id: number;
  arabic: string;
  english: string;
  source: string;
  narrator: string;
  topic: string;
}

export const HADITH_COLLECTION: Hadith[] = [
  { id: 1, arabic: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ", english: "Actions are judged by intentions, and every person will have what they intended.", source: "Sahih Al-Bukhari 1", narrator: "Umar ibn Al-Khattab (RA)", topic: "Intentions" },
  { id: 2, arabic: "الدِّينُ النَّصِيحَةُ", english: "The religion is sincerity (and goodly advice).", source: "Sahih Muslim 55", narrator: "Tamim ad-Dari (RA)", topic: "Character" },
  { id: 3, arabic: "لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ", english: "None of you truly believes until he loves for his brother what he loves for himself.", source: "Sahih Al-Bukhari 13", narrator: "Anas ibn Malik (RA)", topic: "Brotherhood" },
  { id: 4, arabic: "مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ", english: "Whoever believes in Allah and the Last Day should speak good or remain silent.", source: "Sahih Al-Bukhari 6018", narrator: "Abu Hurayrah (RA)", topic: "Speech" },
  { id: 5, arabic: "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ", english: "Seeking knowledge is an obligation upon every Muslim.", source: "Sunan Ibn Majah 224", narrator: "Anas ibn Malik (RA)", topic: "Knowledge" },
  { id: 6, arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ", english: "The best of you are those who learn the Quran and teach it.", source: "Sahih Al-Bukhari 5027", narrator: "Uthman ibn Affan (RA)", topic: "Quran" },
  { id: 7, arabic: "الصَّلَاةُ عِمَادُ الدِّينِ", english: "Prayer is the pillar of the religion.", source: "Al-Bayhaqi 2579", narrator: "Mu'adh ibn Jabal (RA)", topic: "Prayer" },
  { id: 8, arabic: "الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ", english: "A Muslim is one from whose tongue and hand other Muslims are safe.", source: "Sahih Al-Bukhari 10", narrator: "Abu Hurayrah (RA)", topic: "Character" },
  { id: 9, arabic: "ابْتَغُوا فِي أَمْوَالِ الْيَتَامَى لَا تَأْكُلُهَا الزَّكَاةُ", english: "Invest the wealth of orphans so it is not consumed by Zakat.", source: "Al-Muwatta 13:23", narrator: "Umar ibn Al-Khattab (RA)", topic: "Charity" },
  { id: 10, arabic: "أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ", english: "The most beloved deeds to Allah are those that are most consistent, even if small.", source: "Sahih Al-Bukhari 6464", narrator: "Aishah (RA)", topic: "Worship" },
  { id: 11, arabic: "الطُّهُورُ شَطْرُ الْإِيمَانِ", english: "Cleanliness is half of faith.", source: "Sahih Muslim 223", narrator: "Abu Malik Al-Ash'ari (RA)", topic: "Purity" },
  { id: 12, arabic: "اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ", english: "Fear Allah wherever you are.", source: "Sunan At-Tirmidhi 1987", narrator: "Abu Dhar (RA)", topic: "Taqwa" },
  { id: 13, arabic: "الْبِرُّ حُسْنُ الْخُلُقِ", english: "Righteousness is good character.", source: "Sahih Muslim 2553", narrator: "An-Nawwas ibn Sam'an (RA)", topic: "Character" },
  { id: 14, arabic: "خَيْرُ النَّاسِ أَنْفَعُهُمْ لِلنَّاسِ", english: "The best of people are those who are most beneficial to others.", source: "Al-Mu'jam Al-Awsat 5787", narrator: "Jabir ibn Abdullah (RA)", topic: "Service" },
  { id: 15, arabic: "مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ", english: "Whoever fasts Ramadan with faith and seeking reward, his past sins will be forgiven.", source: "Sahih Al-Bukhari 38", narrator: "Abu Hurayrah (RA)", topic: "Ramadan" },
  { id: 16, arabic: "إِنَّ اللَّهَ جَمِيلٌ يُحِبُّ الْجَمَالَ", english: "Allah is beautiful and loves beauty.", source: "Sahih Muslim 91", narrator: "Ibn Mas'ud (RA)", topic: "Beauty" },
  { id: 17, arabic: "مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ", english: "Whoever treads a path in search of knowledge, Allah will make easy for him a path to Paradise.", source: "Sahih Muslim 2699", narrator: "Abu Hurayrah (RA)", topic: "Knowledge" },
  { id: 18, arabic: "الرَّاحِمُونَ يَرْحَمُهُمُ الرَّحْمَنُ", english: "Those who show mercy will be shown mercy by the Most Merciful.", source: "Sunan Abu Dawud 4941", narrator: "Abdullah ibn Amr (RA)", topic: "Mercy" },
  { id: 19, arabic: "مَنْ لَمْ يَشْكُرِ النَّاسَ لَمْ يَشْكُرِ اللَّهَ", english: "Whoever does not thank people does not thank Allah.", source: "Sunan Abu Dawud 4811", narrator: "Abu Hurayrah (RA)", topic: "Gratitude" },
  { id: 20, arabic: "إِنَّ مِنْ أَحَبِّكُمْ إِلَيَّ أَحْسَنَكُمْ أَخْلَاقًا", english: "The most beloved among you to me are those with the best character.", source: "Sahih Al-Bukhari 3559", narrator: "Jabir (RA)", topic: "Character" },
  { id: 21, arabic: "الْمُؤْمِنُ لِلْمُؤْمِنِ كَالْبُنْيَانِ يَشُدُّ بَعْضُهُ بَعْضًا", english: "A believer to another believer is like a building whose different parts support each other.", source: "Sahih Al-Bukhari 481", narrator: "Abu Musa Al-Ash'ari (RA)", topic: "Unity" },
  { id: 22, arabic: "مَنْ أَحَبَّ أَنْ يُبْسَطَ لَهُ فِي رِزْقِهِ وَيُنْسَأَ لَهُ فِي أَثَرِهِ فَلْيَصِلْ رَحِمَهُ", english: "Whoever wants his provision to be expanded and his life to be extended should maintain ties of kinship.", source: "Sahih Al-Bukhari 5986", narrator: "Anas ibn Malik (RA)", topic: "Family" },
  { id: 23, arabic: "كُلُّ مَعْرُوفٍ صَدَقَةٌ", english: "Every act of goodness is charity.", source: "Sahih Al-Bukhari 6021", narrator: "Jabir (RA)", topic: "Charity" },
  { id: 24, arabic: "إِنَّ اللَّهَ لَا يَنْظُرُ إِلَى صُوَرِكُمْ وَأَمْوَالِكُمْ وَلَكِنْ يَنْظُرُ إِلَى قُلُوبِكُمْ وَأَعْمَالِكُمْ", english: "Allah does not look at your forms and wealth, but looks at your hearts and deeds.", source: "Sahih Muslim 2564", narrator: "Abu Hurayrah (RA)", topic: "Sincerity" },
  { id: 25, arabic: "إِذَا مَاتَ الإِنْسَانُ انْقَطَعَ عَنْهُ عَمَلُهُ إِلَّا مِنْ ثَلَاثَةٍ", english: "When a person dies, all deeds end except three: ongoing charity, beneficial knowledge, and a righteous child who prays for them.", source: "Sahih Muslim 1631", narrator: "Abu Hurayrah (RA)", topic: "Legacy" },
  { id: 26, arabic: "لَا تَغْضَبْ وَلَكَ الْجَنَّةُ", english: "Do not get angry, and for you is Paradise.", source: "Al-Mu'jam Al-Kabir", narrator: "A companion (RA)", topic: "Patience" },
  { id: 27, arabic: "مَنْ صَلَّى عَلَيَّ وَاحِدَةً صَلَّى اللَّهُ عَلَيْهِ عَشْرًا", english: "Whoever sends blessings upon me once, Allah sends blessings upon him ten times.", source: "Sahih Muslim 408", narrator: "Abu Hurayrah (RA)", topic: "Salawat" },
  { id: 28, arabic: "أَفْضَلُ الصِّيَامِ بَعْدَ رَمَضَانَ شَهْرُ اللَّهِ الْمُحَرَّمُ", english: "The best fasting after Ramadan is the month of Muharram.", source: "Sahih Muslim 1163", narrator: "Abu Hurayrah (RA)", topic: "Fasting" },
  { id: 29, arabic: "إِنَّ اللَّهَ كَتَبَ الْإِحْسَانَ عَلَى كُلِّ شَيْءٍ", english: "Allah has ordained excellence (ihsan) in everything.", source: "Sahih Muslim 1955", narrator: "Shaddad ibn Aws (RA)", topic: "Excellence" },
  { id: 30, arabic: "حَقُّ الْمُسْلِمِ عَلَى الْمُسْلِمِ سِتٌّ", english: "The right of a Muslim over a Muslim is six: greet them, accept invitations, give sincere advice, say Yarhamukallah when they sneeze, visit them when sick, and attend their funeral.", source: "Sahih Muslim 2162", narrator: "Abu Hurayrah (RA)", topic: "Rights" },
];

export function getDailyHadith(): Hadith {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return HADITH_COLLECTION[dayOfYear % HADITH_COLLECTION.length];
}

export function getRandomHadith(): Hadith {
  return HADITH_COLLECTION[Math.floor(Math.random() * HADITH_COLLECTION.length)];
}
