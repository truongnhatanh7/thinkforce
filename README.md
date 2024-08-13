# ThinkForce | AI Knowledge Fusion

## Motivation

This project is inspired by STORM framework created by Stanford University. The initial work of STORM was to study the ability of LLM to write Wikipedia articles - this sparks me another idea of using STORM to combine multiple knowledge sources to boost the ability of learning.

## Description

### Overview ThinkForce RAG

Overall steps to construct STORM

- Generate Outline
  - Generate related topics
  - Generate personas
  - QA Loops
    - Might include Search
  - Refine Outline
- For each sections, write article
  - Might search for more information to write
  - Add references
- Post processing the generated article
  - Might perform post referencing
  - Polish
- (Optional) Upload to R2

### Architecture

Currently, there's only a Trigger.dev back-end. Trigger.dev is used to maintain a long running LLM process of generating reports (which could be up to 5-10mins)

## How to run

Feed Trigger.dev with these secrets

```
GOOGLE_API_KEY
GOOGLE_CSE_CX
OPEN_AI_KEY
CLOUDFLARE_R2_ENDPOINT
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
```

Then

```
pnpm install
cd triggerdotdev
pnpm run dev
```
Use the "Test" feature of Trigger.dev to observe the result.

## Limitation and Future work

- Despite the fact that this pipeline could be customized for many purposes, the intial pipeline costs a lot of money to run, hence any modifications to it could raise the bill up. So be careful while using it
- Paragraph length limited by LMs context window
- Gpt 4o mini tends to not follow instruction strictly
- Cannot read PDFs from Google for now
- The system sometimes malfuntioned due to LLM could not follow the instruction

TODO: Add proper front-end, set up infrastructure for a live version

## LICENSE

MIT
