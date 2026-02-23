# **App Name**: OHADA Legal Advisor

## Core Features:

- Chatbot UI: Interactive chatbot interface using Next.js to display user and assistant messages.
- Real-time Typing Indicator: Display a 'typing...' indicator while the assistant is generating a response.
- Similar Cases Display: Display similar cases under each assistant response, including title, similarity percentage, and reason for similarity.
- Message History: Maintain chat history in memory (state) and optionally persist it in localStorage.
- Genkit-Powered Chat: Backend flow using Genkit to handle user input, retrieve relevant case details from Supabase, and generate a comprehensive response using Gemini.
- AI-Powered Response Generation: Use Gemini (Vertex AI) to generate human-like responses including a summary, similar cases (with percentages), leads, a checklist, risks, and internal references.  The LLM will use the tool that extracts information from Supabase to decide what information should be in its response.
- Case Indexing Script: A script to chunk case text, generate embeddings using Gemini, and insert them into Supabase for efficient similarity searches.

## Style Guidelines:

- Primary color: Deep blue (#2E3192), representing authority and trust in the legal domain.
- Background color: Very light blue (#F0F2FA), providing a clean and professional backdrop.
- Accent color: Soft lavender (#8074AC), offering a modern, subtle contrast.
- Body text and headline font: 'Inter', a sans-serif for modern readability and a neutral aesthetic.
- Code Font: 'Source Code Pro' for code snippets.
- Simple, professional icons to represent different legal categories and actions.
- Subtle animations for loading states and transitions to enhance user experience without distraction.