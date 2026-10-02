// Spaced Repetition Memory Engine (FSRS / SM-2) with LocalStorage & IndexedDB

const STORAGE_KEY = "articulate_fsrs_items";

export class FsrsDatabase {
  constructor() {
    this.items = this.loadItems();
  }

  loadItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Error loading FSRS items:", e);
    }

    // Default seeded starter review items
    return [
      {
        id: "seed_think",
        word: "think",
        targetPhoneme: "θ",
        type: "pronunciation",
        reps: 1,
        stability: 1.2,
        difficulty: 4.8,
        lastAccuracy: 65,
        lastReviewed: Date.now() - 86400000 * 2,
        nextReview: Date.now() - 1000,
        notes: "Unvoiced dental fricative /θ/ often replaced by /s/"
      },
      {
        id: "seed_sheet",
        word: "sheet",
        targetPhoneme: "iː",
        type: "pronunciation",
        reps: 0,
        stability: 1.0,
        difficulty: 5.2,
        lastAccuracy: 58,
        lastReviewed: Date.now() - 86400000,
        nextReview: Date.now() - 1000,
        notes: "Tense vowel /iː/ requires wide smiling lips"
      },
      {
        id: "seed_right",
        word: "right",
        targetPhoneme: "ɹ",
        type: "pronunciation",
        reps: 2,
        stability: 2.5,
        difficulty: 4.0,
        lastAccuracy: 88,
        lastReviewed: Date.now() - 86400000,
        nextReview: Date.now() + 86400000 * 3,
        notes: "Postalveolar /ɹ/ - do not touch alveolar ridge"
      }
    ];
  }

  saveItems() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.warn("Error saving FSRS items:", e);
    }
  }

  /**
   * Retrieves items due for practice today
   */
  getDueItems(limit = 6) {
    const now = Date.now();
    return this.items
      .filter(item => item.nextReview <= now)
      .sort((a, b) => a.nextReview - b.nextReview)
      .slice(0, limit);
  }

  getAllItems() {
    return [...this.items].sort((a, b) => a.nextReview - b.nextReview);
  }

  /**
   * Records a user's practice attempt and calculates the next interval
   * @param {string} word - target word or phrase
   * @param {number} accuracy - 0 to 100
   * @param {string} type - 'pronunciation' | 'vocabulary' | 'grammar'
   * @param {string} targetPhoneme - optional IPA phoneme
   * @param {string} notes - optional tips
   */
  recordAttempt(word, accuracy, type = "pronunciation", targetPhoneme = "", notes = "") {
    const cleanWord = word.trim().toLowerCase();
    let item = this.items.find(i => i.word.toLowerCase() === cleanWord);

    const now = Date.now();
    // Rating q from 1 to 5 based on accuracy percentage
    let q = 3;
    if (accuracy >= 85) q = 5;
    else if (accuracy >= 70) q = 4;
    else if (accuracy >= 55) q = 3;
    else if (accuracy >= 40) q = 2;
    else q = 1;

    if (!item) {
      item = {
        id: "item_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        word: cleanWord,
        targetPhoneme: targetPhoneme || "",
        type,
        reps: 0,
        stability: 1.0,
        difficulty: 5.0,
        lastAccuracy: accuracy,
        lastReviewed: now,
        nextReview: now,
        notes: notes || ""
      };
      this.items.push(item);
    }

    item.lastAccuracy = accuracy;
    item.lastReviewed = now;
    if (targetPhoneme) item.targetPhoneme = targetPhoneme;
    if (notes) item.notes = notes;

    // FSRS / SM-2 interval calculation
    if (q >= 3) {
      if (item.reps === 0) {
        item.intervalDays = 1;
      } else if (item.reps === 1) {
        item.intervalDays = 3;
      } else {
        item.intervalDays = Math.round((item.intervalDays || 3) * (item.stability || 2.0));
      }
      item.reps += 1;
      // Increase stability on success
      item.stability = Math.min(3.5, (item.stability || 1.0) + 0.15);
      // Reduce difficulty
      item.difficulty = Math.max(1.3, (item.difficulty || 5.0) - 0.1);
    } else {
      // Failed turn: reset interval to 10 minutes (immediate review)
      item.reps = 0;
      item.intervalDays = 0.01; // ~15 minutes
      item.stability = Math.max(0.8, (item.stability || 1.0) - 0.25);
      item.difficulty = Math.min(6.5, (item.difficulty || 5.0) + 0.2);
    }

    item.nextReview = now + Math.round(item.intervalDays * 24 * 60 * 60 * 1000);
    this.saveItems();
    return item;
  }

  deleteItem(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.saveItems();
  }
}
