# ChatGPT Companion

Discere can use an ordinary ChatGPT subscription for lesson-specific tutoring and review of handwritten workings without calling the OpenAI API. The prototype uses an explicit copy-and-paste handoff, keeping model access under the learner's control and preserving a usable fallback when a full ChatGPT-native application host is unavailable.

## Lesson tutor

1. Start Discere and open the current lesson.
2. Choose Coach, Assisted, or Direct mode.
3. Open **Ask a question using your ChatGPT subscription**.
4. Enter the question you want answered.
5. Select **Prepare tutor prompt**.
6. Discere copies a structured prompt when browser permissions allow it.
7. Select **Open ChatGPT** and paste the prompt into a normal ChatGPT conversation.
8. Copy ChatGPT's complete JSON object.
9. Paste it into **ChatGPT JSON response** in Discere.
10. Select **Validate tutor reply**.

Discere displays the response only after validation. A rejected response shows the exact issues that should be corrected.

## Handwritten workings review

The notebook review uses ChatGPT's image understanding while keeping the image attachment manual.

1. Draw or type the working in the Discere notebook.
2. Select **Save workings**.
3. Select **Download PNG**.
4. Open **Have ChatGPT inspect the saved page**.
5. Describe what the reviewer should focus on.
6. Select **Prepare review prompt**.
7. Open ChatGPT, paste the prompt, and attach the named PNG.
8. Copy ChatGPT's JSON response into Discere.
9. Select **Validate review**.

An accepted review contains:

- confirmation that an image was reviewed
- a faithful transcription of visible steps
- transcription confidence from 0 to 1
- an assessment of `correct`, `partly_correct`, `incorrect`, or `unclear`
- direct feedback
- the first meaningful error when one exists
- the smallest useful next step
- approved source IDs
- uncertainty about unreadable marks

Discere rejects a review when the image was omitted, a low-confidence reading claims a definite result, an incorrect review fails to identify the first important error, an unknown source is used, or guided feedback exposes the active answer.

## Tutoring modes

### Coach

The packet asks ChatGPT to identify the next useful step and preserve the active assessment answer boundary. The final answer is rejected when it appears in imported tutor feedback or workings-review guidance.

### Assisted

The packet permits a stronger explanation or partial worked step. The active assessment answer remains protected.

### Direct

The packet permits a direct answer and concise working. Prose rules, source restrictions, image checks, and request matching still apply.

### Exam

The tutor and workings review are unavailable. The learner must finish or leave Exam mode before external help can be opened.

## What a packet contains

A companion packet contains:

- a unique request ID
- the selected operation
- the tutoring mode
- a mode-specific response policy
- the current learner-safe lesson
- the assessment prompt without its answer authority
- available reference-source identifiers
- an exact JSON response schema
- the Discere writing contract

Tutor packets also contain the learner's question.

Workings-review packets contain:

- the learner's review request
- the saved notebook page type
- the typed note
- the number of saved strokes
- the save timestamp
- the required PNG filename
- an instruction to assess the attached image rather than infer the working from the note

The hidden answer authority is never included in a learner-facing packet.

## Validation

Imported tutor replies pass through:

- valid protocol and JSON structure
- operation and response shape checks
- response request-ID matching against the prepared request, enforced at the server boundary
- anti-AI-writing lint rules
- guided-mode answer-leak detection
- source IDs restricted to those supplied with the lesson

Workings reviews add:

- `imageReviewed` confirmation
- transcription-confidence consistency
- first-error requirements for incorrect work
- transcription requirements for confident image readings
- consistency warnings when a review is marked correct and also identifies an error

Only material without hard validation failures is shown as accepted.

## Tutor reply format

The prepared prompt contains the exact contract. A tutor reply resembles:

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

## Workings review format

```json
{
  "protocolVersion": "0.2",
  "operation": "workings_review",
  "requestId": "copied-from-the-request",
  "generatedAt": "2026-08-17T05:00:00.000Z",
  "payload": {
    "imageReviewed": true,
    "transcription": "I = 5 / 100, followed by the learner's written result.",
    "transcriptionConfidence": 0.92,
    "assessment": "partly_correct",
    "feedback": "The formula uses the supplied values. The decimal step needs another check.",
    "firstMeaningfulError": "The decimal result after division is shifted one place.",
    "nextStep": "Repeat the division and check the place value before converting units.",
    "sourceIds": [],
    "uncertainty": []
  }
}
```

Do not paste Markdown fences or extra commentary around the JSON object. Discere deliberately rejects ambiguous mixed text.

## Correcting a rejected response

Copy the issue codes and messages back into the same ChatGPT conversation. Ask for a corrected JSON object while preserving the original `protocolVersion`, `operation`, and `requestId`.

Common rejection reasons include:

- exposing the active answer in Coach or Assisted mode
- using a prohibited rhetorical pattern
- citing a source ID that Discere did not provide
- returning Markdown around the object
- using a response from an older prepared request
- failing to attach the workings image
- claiming a definite assessment from an unreadable image

## Privacy and model access

Discere sends nothing automatically. The learner controls which packet and notebook PNG enter ChatGPT and which response returns to Discere. The local database remains on the learner's machine.

The handoff uses the ChatGPT web product and the user's existing subscription. It does not treat the subscription as an API credential, and Discere does not automate the ChatGPT website.

## Future native host

The repository includes a host-neutral MCP boundary for a future ChatGPT-native interface. That path should reuse the same contracts, writing checks, source restrictions, image-review rules, and authoritative local state. The companion workflow remains the required fallback.
