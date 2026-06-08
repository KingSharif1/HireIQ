const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','are','was','were','be','been','being','have','has','had','do',
  'does','did','will','would','could','should','may','might','shall','must',
  'this','that','these','those','i','we','you','he','she','it','they','me',
  'us','him','her','them','my','our','your','his','its','their','what','which',
  'who','how','when','where','why','all','any','both','each','few','more','most',
  'other','some','such','no','not','only','same','so','than','too','very','just',
  'about','above','after','also','as','before','between','during','if','into',
  'new','now','our','over','per','re','since','still','through','under','up',
  'use','using','via','well','work','working','strong','experience','years',
  'including','ability','skills','knowledge','team','role','position','job',
  'company','opportunity','required','preferred','candidates','applicants',
  'equal','employer','opportunity','responsible','responsibilities','like',
  'looking','make','need','provide','support','help','join','build','create',
])

export function extractKeywords(text: string): { keywords: string[]; phrases: string[] } {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s\-\+\.]/g, ' ')
  const words = normalized.split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w))

  // Deduplicate single keywords
  const keywords = [...new Set(words)]

  // Extract 2-3 word phrases (bigrams/trigrams) that appear multiple times
  const allWords = normalized.split(/\s+/)
  const phraseCount: Record<string, number> = {}

  for (let i = 0; i < allWords.length - 1; i++) {
    const bigram = `${allWords[i]} ${allWords[i + 1]}`
    if (!STOPWORDS.has(allWords[i]) && !STOPWORDS.has(allWords[i + 1])) {
      phraseCount[bigram] = (phraseCount[bigram] || 0) + 1
    }
    if (i < allWords.length - 2) {
      const trigram = `${allWords[i]} ${allWords[i + 1]} ${allWords[i + 2]}`
      phraseCount[trigram] = (phraseCount[trigram] || 0) + 1
    }
  }

  const phrases = Object.entries(phraseCount)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([phrase]) => phrase)
    .slice(0, 20)

  return { keywords: keywords.slice(0, 100), phrases }
}

export function normalizeSkill(skill: string): string {
  return skill.toLowerCase().replace(/[\s\-\.\/]/g, '')
}
