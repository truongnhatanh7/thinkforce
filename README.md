# ThinkForce | AI Knowledge Fusion

## Motivation

This project is inspired by the **[STORM](https://arxiv.org/abs/2402.14207)** framework created by Stanford University. The initial work of STORM was to study the ability of LLM to write Wikipedia articles. This sparked another idea of using STORM to combine multiple knowledge sources to enhance learning capabilities. Therefore, I created this project to study about the ability of LLM in helping human learn new topics through reports.

## Description

### Overview ThinkForce RAG

**High-level procedures**

*(Noted that this implementation might differ from the original STORM, since this is customized for knowledge curation purpose)*

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
  - (Optional) Convert to other formats

### Architecture

Currently, there's only a Trigger.dev back-end. Trigger.dev is used to maintain a long running LLM process of generating reports (which could be up to 5-10mins). More components like serverless, UIs will be updated in the future.

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

- Although this pipeline can be customized for various purposes, the initial pipeline is expensive to run. Therefore, any modifications to it may increase the cost. Please use it with caution.
- The context window of the language models could affect the writing.
- Gpt 4o mini tends to deviate from instructions.
- Currently, PDFs from Google cannot be read.
- The system may occasionally malfunction. This is a common problem in agentic system.

TODO: Add a front-end interface, set up infrastructure for a live version

## LICENSE

MIT
