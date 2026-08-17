# ChatGPT Companion

Discere can use an ordinary ChatGPT subscription for lesson-specific tutoring without calling the OpenAI API. The current prototype uses an explicit copy-and-paste handoff so it stays within supported product boundaries and remains usable when a full ChatGPT-native application host is unavailable.

## How to use it

1. Start Discere and open the current lesson.
2. Choose Coach, Assisted, or Direct mode.
3. Open **Ask a question using your ChatGPT subscription**.
4. Enter the question you want answered.
5. Select **Prepare tutor prompt**.
6. Discere copies a structured prompt to the clipboard when browser permissions allow it.
7. Select **Open ChatGPT** and paste the prompt into a normal ChatGPT conversation.
8. ChatGPT should return one JSON object.
9. Copy that full object and paste it into **ChatGPT JSON response** in Discere.
10. Select **Validate tutor reply**.

Discere displays the response only after validation. A rejected response shows the exact issues that should be corrected.

## Tutoring modes

### Coach

The packet asks ChatGPT to identify the next useful step and preserve the active assessment answer boundary. The final answer is rejected when it appears in the imported reply.

### Assisted

The packet permits a stronger explanation or partial worked step. The final active-assessment answer remains protected.

### Direct

The packet permits a direct answer and concise working. Prose rules and source restrictions still apply.

### Exam

The companion is unavailable. The learner must finish or leave Exam mode before external tutoring help can be opened.

## What the packet contains

A tutor packet contains:

- a unique request ID
- the learner's question
- the selected tutoring mode
- a mode-specific response policy
- the current learner-safe lesson
- the current assessment prompt without its answer authority
- available reference-source identifiers
- an exact JSON response schema
- the Discere writing contract

The hidden answer authority is never included in a learner-facing tutor packet.

## Validation

Imported tutor replies pass through several checks:

- valid protocol and JSON structure
- response request ID matching
- expected tutor-reply payload shape
- anti-AI-writing lint rules
- guided-mode answer-leak detection
- source IDs restricted to those supplied with the lesson
- uncertainty and follow-up fields constrained by schema

The response is not persisted as trusted course content. It is displayed as a validated reply for the current tutoring exchange.

## Expected response format

The prepared prompt contains the exact contract. A reply resembles:

```json
{
  "protocolVersion": "0.2",
  "operation": "tutor_reply",
  "requestId": "copied-from-the-request",
  "generatedAt": "2026-08-17T04:00:00.000Z",
  "payload": {
    "answer": "Plain, direct tutoring response.",
    "followUpQuestion": "One short question that advances understanding.",
    "sourceIds": [],
    "uncertainty": []
  }
}
```

Do not paste Markdown fences or extra commentary around the JSON object. Discere deliberately rejects ambiguous mixed text.

## Correcting a rejected reply

Copy the listed issue codes and messages back into the same ChatGPT conversation. Ask it to return a corrected JSON object while keeping the original `protocolVersion`, `operation`, and `requestId`.

Common rejection reasons include:

- revealing the active answer in Coach or Assisted mode
- using a banned rhetorical pattern
- citing a source ID that Discere did not provide
- returning Markdown around the object
- using a response from an older prepared request

## Privacy and model access

Discere sends nothing automatically. The learner controls which packet is copied into ChatGPT and which response is returned to Discere. The local database remains on the learner's machine.

The handoff uses the ChatGPT web product and the user's existing subscription. It does not treat the subscription as an API credential, and Discere does not automate the ChatGPT website.

## Future native host

The repository includes a host-neutral MCP boundary for a future ChatGPT-native interface. That path should reuse the same contracts, writing checks, source restrictions, and authoritative local state. The companion workflow remains the required fallback.
