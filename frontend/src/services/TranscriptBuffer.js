/**
 * TranscriptBuffer - Manages transcript buffering with regex intent detection
 * and rate-limited Gemini calls for task extraction
 */

// Gemini API key from environment
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Minimum time between Gemini calls (15 seconds for testing)
const MIN_CALL_INTERVAL_MS = 20 * 1000;

// ============================================
// REGEX PATTERNS FOR INTENT DETECTION
// ============================================

// Simple action verbs
const ACTION_VERBS = /\b(need|should|will|must|please|let's|can|could|do|make|send|check|update|review|call|email|work|task|handle|finish|complete)\b/i;

// Simple responsibility/assignment 
const RESPONSIBILITY_PHRASES = /\b(you|your|I'll|I will|we|someone|team|@\w+)\b/i;

// Time words
const TIME_URGENCY = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|soon|asap|urgent|deadline|week|day|morning|afternoon|evening)\b/i;

// Strong patterns 
const STRONG_ACTION_PATTERNS = /\b(action|todo|task|follow.?up|next step|milestone|deliverable|homework|meeting|project)\b/i;

// ============================================
// TRANSCRIPT BUFFER CLASS
// ============================================

class TranscriptBuffer {
    constructor() {
        this.buffer = []; // Array of { text: string, timestamp: number }
        this.lastLLMCallAt = 0;
        this.regexHitSinceLastCall = false;
        this.isCallingGemini = false;
    }

    /**
     * Add a final transcript to the buffer and check for intent patterns
     * @param {string} text - The transcript text
     * @returns {boolean} - Whether regex patterns were detected
     */
    addTranscript(text) {
        if (!text || text.trim() === "") return false;

        // Store the transcript
        this.buffer.push({
            text: text.trim(),
            timestamp: Date.now()
        });

        console.log(`[Buffer] Added transcript: "${text.trim().substring(0, 50)}..." (Total: ${this.buffer.length})`);

        // Check regex patterns
        const hasIntentMatch = this.checkIntentPatterns(text);

        if (hasIntentMatch) {
            this.regexHitSinceLastCall = true;
            console.log("[Buffer] ✓ Regex intent detected!");
        }

        return hasIntentMatch;
    }

    /**
     * Check if text matches intent patterns
     * @param {string} text - Text to check
     * @returns {boolean} - Whether intent patterns were detected
     */
    checkIntentPatterns(text) {
        // Check strong action patterns first (these alone are enough)
        if (STRONG_ACTION_PATTERNS.test(text)) {
            console.log("[Regex] ✓ Strong action pattern matched");
            return true;
        }

        // Count how many pattern groups match
        let matchedGroups = 0;

        if (ACTION_VERBS.test(text)) {
            matchedGroups++;
            console.log("[Regex] ✓ Action verb matched");
        }

        if (RESPONSIBILITY_PHRASES.test(text)) {
            matchedGroups++;
            console.log("[Regex] ✓ Responsibility phrase matched");
        }

        if (TIME_URGENCY.test(text)) {
            matchedGroups++;
            console.log("[Regex] ✓ Time/urgency matched");
        }

        // RELAXED: Trigger if just 1 group matches (for testing)
        return matchedGroups >= 1;
    }

    /**
     * Check if conditions are met for calling Gemini
     * @returns {{ canCall: boolean, reason: string }}
     */
    checkGeminiConditions() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastLLMCallAt;
        const hasEnoughTime = timeSinceLastCall >= MIN_CALL_INTERVAL_MS;

        if (this.isCallingGemini) {
            return { canCall: false, reason: "Gemini call already in progress" };
        }

        if (!this.regexHitSinceLastCall) {
            return { canCall: false, reason: "No regex intent detected since last call" };
        }

        if (!hasEnoughTime) {
            const remaining = Math.ceil((MIN_CALL_INTERVAL_MS - timeSinceLastCall) / 1000);
            return { canCall: false, reason: `Time gate: ${remaining}s remaining` };
        }

        if (this.buffer.length === 0) {
            return { canCall: false, reason: "Buffer is empty" };
        }

        return { canCall: true, reason: "All conditions met" };
    }

    /**
     * Get all buffered transcripts as a single text
     * @returns {string}
     */
    getBufferedText() {
        return this.buffer.map(entry => entry.text).join(" ");
    }

    /**
     * Call Gemini to extract task candidates
     * @returns {Promise<Object|null>}
     */
    async callGemini() {
        const conditions = this.checkGeminiConditions();

        if (!conditions.canCall) {
            console.log(`[Gemini] Skipping: ${conditions.reason}`);
            return null;
        }

        if (!GEMINI_API_KEY) {
            console.error("[Gemini] VITE_GEMINI_API_KEY is not set");
            return null;
        }

        this.isCallingGemini = true;
        const transcriptText = this.getBufferedText();
        const transcriptCount = this.buffer.length;

        console.log(`%c[Gemini] 🚀 Calling with ${transcriptCount} transcripts (${transcriptText.length} chars)`, "font-weight: bold; color: #fbbf24;");

        const prompt = `You are a meeting assistant that extracts actionable tasks from meeting transcripts.

Analyze the following meeting transcript and extract any tasks, action items, or assignments mentioned.

TRANSCRIPT:
"""
${transcriptText}
"""

Extract tasks in the following STRICT JSON format. Return ONLY valid JSON, no markdown or explanations:

{
  "tasks": [
    {
      "title": "Brief task title",
      "description": "Detailed description of what needs to be done",
      "assignee": "Person responsible (or 'Unassigned' if not clear)",
      "priority": "high" | "medium" | "low",
      "deadline": "Mentioned deadline or 'Not specified'",
      "confidence": 0.0-1.0
    }
  ],
  "summary": "Brief summary of the meeting segment"
}

If no clear tasks are found, return: {"tasks": [], "summary": "No clear tasks identified"}`;

        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.2,
                        topP: 0.8,
                        topK: 40,
                        maxOutputTokens: 4096  // Increased to prevent truncation
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

            // Parse JSON from response
            let result;
            try {
                // Strip markdown code blocks if present
                let cleanedResponse = textResponse;
                if (cleanedResponse.includes("```json")) {
                    cleanedResponse = cleanedResponse.replace(/```json\s*/g, "").replace(/```\s*/g, "");
                } else if (cleanedResponse.includes("```")) {
                    cleanedResponse = cleanedResponse.replace(/```\s*/g, "");
                }

                // Try to extract JSON from the response
                const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        result = JSON.parse(jsonMatch[0]);
                    } catch (innerError) {
                        // If JSON is truncated, try to fix it
                        console.warn("[Gemini] JSON appears truncated, attempting repair...");
                        let fixedJson = jsonMatch[0];

                        // Count open/close braces and brackets
                        const openBraces = (fixedJson.match(/\{/g) || []).length;
                        const closeBraces = (fixedJson.match(/\}/g) || []).length;
                        const openBrackets = (fixedJson.match(/\[/g) || []).length;
                        const closeBrackets = (fixedJson.match(/\]/g) || []).length;

                        // Try to close unclosed structures
                        // First, try to find the last complete task and truncate there
                        const tasksMatch = fixedJson.match(/"tasks"\s*:\s*\[/);
                        if (tasksMatch) {
                            // Find all complete task objects
                            const taskPattern = /\{\s*"title"\s*:\s*"[^"]*"\s*,\s*"description"\s*:\s*"[^"]*"\s*,\s*"assignee"\s*:\s*"[^"]*"\s*,\s*"priority"\s*:\s*"[^"]*"\s*,\s*"deadline"\s*:\s*"[^"]*"\s*,\s*"confidence"\s*:\s*[\d.]+\s*\}/g;
                            const completeTasks = fixedJson.match(taskPattern);

                            if (completeTasks && completeTasks.length > 0) {
                                // Reconstruct with only complete tasks
                                result = {
                                    tasks: completeTasks.map(taskStr => JSON.parse(taskStr)),
                                    summary: "Partial response - some tasks may be missing"
                                };
                                console.log(`[Gemini] Recovered ${completeTasks.length} complete task(s) from truncated response`);
                            } else {
                                throw innerError;
                            }
                        } else {
                            throw innerError;
                        }
                    }
                } else {
                    throw new Error("No JSON found in response");
                }
            } catch (parseError) {
                console.error("[Gemini] Failed to parse response:", parseError);
                console.log("[Gemini] Raw response:", textResponse.substring(0, 500) + "...");
                result = { tasks: [], summary: "Failed to parse response", error: parseError.message };
            }

            // Log the structured task candidates
            console.log("%c[Gemini] ✅ Task Candidates:", "font-weight: bold; color: #4ade80;");
            console.log(JSON.stringify(result, null, 2));

            if (result.tasks && result.tasks.length > 0) {
                result.tasks.forEach((task, i) => {
                    console.log(`%c  📋 Task ${i + 1}: ${task.title}`, "font-weight: bold; color: #60a5fa;");
                    console.log(`    Assignee: ${task.assignee}`);
                    console.log(`    Priority: ${task.priority}`);
                    console.log(`    Deadline: ${task.deadline}`);
                    console.log(`    Confidence: ${(task.confidence * 100).toFixed(0)}%`);
                });
            } else {
                console.log("  No tasks detected in this segment");
            }

            // Reset state after successful call
            this.lastLLMCallAt = Date.now();
            this.regexHitSinceLastCall = false;
            this.buffer = [];
            this.isCallingGemini = false;

            console.log("[Buffer] State reset after Gemini call");

            return result;

        } catch (error) {
            console.error("[Gemini] API call failed:", error);
            this.isCallingGemini = false;
            return null;
        }
    }

    /**
     * Force check and potentially call Gemini
     * @returns {Promise<Object|null>}
     */
    async tryCallGemini() {
        return await this.callGemini();
    }

    /**
     * Get buffer stats for debugging
     * @returns {Object}
     */
    getStats() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastLLMCallAt;
        const timeUntilNextCall = Math.max(0, MIN_CALL_INTERVAL_MS - timeSinceLastCall);

        return {
            bufferSize: this.buffer.length,
            totalChars: this.getBufferedText().length,
            regexHitSinceLastCall: this.regexHitSinceLastCall,
            timeSinceLastCall: Math.floor(timeSinceLastCall / 1000),
            timeUntilNextCall: Math.ceil(timeUntilNextCall / 1000),
            canCallGemini: this.checkGeminiConditions().canCall
        };
    }

    /**
     * Clear the buffer without calling Gemini
     */
    clear() {
        this.buffer = [];
        this.regexHitSinceLastCall = false;
        console.log("[Buffer] Cleared");
    }
}

// Export singleton instance
export const transcriptBuffer = new TranscriptBuffer();
export default TranscriptBuffer;