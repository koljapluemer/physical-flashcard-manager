<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { Check, Loader2, MessageCircle, Send, Sparkles, X } from 'lucide-vue-next';
import CardPreview from './CardPreview.vue';
import * as flashcardsApi from '../api/flashcards';
import type { Collection, Flashcard } from '../types';
import { useSettingsStore } from '../stores/settings';
import { useToastStore } from '../stores/toast';

type ProposedCard = {
  front: string;
  back: string;
  header_right?: string;
};

type AiResponse = {
  reply?: string;
  card?: ProposedCard;
};

type ProposalStatus = 'pending' | 'accepted' | 'dismissed';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  proposal?: ProposedCard;
  proposalStatus?: ProposalStatus;
};

const props = defineProps<{
  collection: Collection | null;
  frontMarkdown: string;
  backMarkdown: string;
  headerRight: string;
}>();

const emit = defineEmits<{
  (e: 'applySuggestion', payload: { front: string; back: string; header_right?: string }): void;
}>();

const settingsStore = useSettingsStore();
const toastStore = useToastStore();

const input = ref('');
const messages = ref<ChatMessage[]>([]);
const sending = ref(false);
const contextLoading = ref(false);
const flashcardContext = ref<Flashcard[]>([]);

const hasApiKey = computed(() => !!settingsStore.openaiApiKey.trim());
const canChat = computed(() => hasApiKey.value && !!props.collection);

watch(
  () => props.collection?.id,
  () => {
    messages.value = [];
    loadContext();
  }
);

onMounted(() => {
  loadContext();
});

async function loadContext() {
  if (!props.collection?.id) {
    flashcardContext.value = [];
    return;
  }
  contextLoading.value = true;
  try {
    const items = await flashcardsApi.getFlashcards(props.collection.id);
    flashcardContext.value = items.slice(0, 8);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to load flashcards for context.';
    toastStore.push(message, 'warning');
  } finally {
    contextLoading.value = false;
  }
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return text.trim();
}

function truncateText(text: string, maxLength = 600) {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}…` : trimmed;
}

function buildMessages(prompt: string) {
  const contextPayload = {
    collection: props.collection
      ? {
          id: props.collection.id,
          title: props.collection.title,
          description: props.collection.description,
          header_text_left: props.collection.header_text_left,
        }
      : null,
    current_card: {
      front: truncateText(props.frontMarkdown),
      back: truncateText(props.backMarkdown),
      header_right: props.headerRight,
    },
    examples: flashcardContext.value.slice(0, 4).map((item) => ({
      id: item.id,
      front: truncateText(item.front, 240),
      back: truncateText(item.back, 240),
      header_right: item.header_right,
    })),
  };

  const history = messages.value.slice(-6).map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const systemContent = [
    'You help edit flashcards for a physical flashcard app.',
    'Always respond with JSON only, no Markdown fences.',
    'Schema: {"reply":"short chat reply","card":{"front":"markdown","back":"markdown","header_right":"optional"}}',
    'Markdown format rules:',
    '- Use **bold**, *italic*, # headings, - bullets, 1. numbered lists',
    '- Math: use $E = mc^2$ for inline math (single dollar signs)',
    '- Colored boxes: use ```box\\nContent here\\n``` fenced code blocks',
    '- Keep answers concise and readable on a small physical card.',
    '- Do NOT use HTML tags - use pure Markdown only.',
    '- Do NOT use \\( \\), \\[ \\], or other LaTeX delimiters - only $...$',
  ].join('\n');

  return [
    { role: 'system' as const, content: systemContent },
    { role: 'user' as const, content: `Context:\n${JSON.stringify(contextPayload)}` },
    ...history,
    { role: 'user' as const, content: prompt },
  ];
}

async function sendMessage() {
  const prompt = input.value.trim();
  if (!prompt) {
    return;
  }
  if (!hasApiKey.value) {
    toastStore.push('Set your OpenAI API key in Settings to chat.', 'warning');
    return;
  }
  if (!props.collection) {
    toastStore.push('Open a collection to chat about this card.', 'warning');
    return;
  }

  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: prompt,
  };
  messages.value = [...messages.value, userMessage];
  input.value = '';
  sending.value = true;

  try {
    const body = {
      model: 'gpt-4o-mini',
      messages: buildMessages(prompt),
      temperature: 0.6,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settingsStore.openaiApiKey.trim()}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from the model.');
    }

    const parsedText = extractJson(content);

    let parsed: AiResponse | undefined;
    let replyText: string;
    let card: ProposedCard | undefined;

    try {
      parsed = JSON.parse(parsedText) as AiResponse;
      replyText = parsed.reply || 'Proposed changes ready.';
      card = parsed.card;
    } catch (jsonError) {
      // JSON parsing failed - log details for debugging
      console.error('JSON Parse Error:', jsonError);
      console.error('Attempted to parse:', parsedText.substring(0, 500)); // Log first 500 chars
      console.error('Full AI response:', content);

      // Try to extract at least the reply text from the raw content
      replyText = 'AI response could not be parsed. The AI may have included invalid characters in the JSON.';

      // Show a helpful error to the user
      toastStore.push(
        'AI returned malformed JSON. Try rephrasing your request or asking for simpler content.',
        'error'
      );

      card = undefined;
    }

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: replyText,
      proposal: card?.front && card?.back ? card : undefined,
      proposalStatus: card?.front && card?.back ? 'pending' : undefined,
    };

    messages.value = [...messages.value, assistantMessage];

    if (parsed && !assistantMessage.proposal) {
      toastStore.push('AI reply did not include a proposed card.', 'warning');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to complete chat request.';
    toastStore.push(message, 'error');
  } finally {
    sending.value = false;
  }
}

function applyProposal(message: ChatMessage) {
  if (!message.proposal) return;

  emit('applySuggestion', {
    front: message.proposal.front,
    back: message.proposal.back,
    header_right: message.proposal.header_right,
  });

  message.proposalStatus = 'accepted';
}

function dismissProposal(message: ChatMessage) {
  message.proposalStatus = 'dismissed';
}
</script>

<template>
  <div class="card shadow">
    <div class="card-body space-y-4">
      <div class="flex flex-wrap items-center gap-3 justify-between">
        <div class="flex items-center gap-2">
          <Sparkles class="h-5 w-5" />
          <div>
            <p class="font-semibold">AI Assistant</p>
            <p class="text-light">Chat to draft or refine this card.</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div v-if="contextLoading" class="flex items-center gap-2 text-light">
            <Loader2 class="h-4 w-4 animate-spin" />
            <span>Loading context</span>
          </div>
          <p v-if="!hasApiKey" class="text-light flex items-center gap-2">
            <X class="h-4 w-4" />
            <span>
              Set your API key
              <RouterLink class="link" to="/settings">here</RouterLink>
              to chat.
            </span>
          </p>
        </div>
      </div>

      <div v-if="canChat" class="space-y-3">
        <div class="space-y-3 max-h-screen overflow-y-auto pr-1">
          <div
            v-for="message in messages"
            :key="message.id"
            class="rounded border border-base-300 p-3"
            :class="{
              'bg-base-200': message.role === 'assistant',
            }"
          >
            <div class="flex items-center gap-2 mb-2">
              <MessageCircle class="h-4 w-4" />
              <span class="font-medium capitalize">{{ message.role }}</span>
            </div>
            <p class="whitespace-pre-line">{{ message.content }}</p>

            <div v-if="message.proposal && message.proposalStatus === 'pending'" class="mt-3 space-y-3">
              <div class="grid gap-3 md:grid-cols-2">
                <div class="rounded border border-base-300 p-2">
                  <p class="font-medium mb-2">Front</p>
                  <CardPreview
                    :markdown="message.proposal.front"
                    side="front"
                    :collection="collection ?? undefined"
                    :flashcard="{ header_right: message.proposal.header_right } as any"
                    :scale="0.9"
                  />
                </div>
                <div class="rounded border border-base-300 p-2">
                  <p class="font-medium mb-2">Back</p>
                  <CardPreview
                    :markdown="message.proposal.back"
                    side="back"
                    :collection="collection ?? undefined"
                    :scale="0.9"
                  />
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <button class="btn btn-primary gap-2" type="button" @click="applyProposal(message)">
                  <Check class="h-4 w-4" />
                  <span>Accept changes</span>
                </button>
                <button
                  class="btn btn-outline gap-2"
                  type="button"
                  @click="dismissProposal(message)"
                >
                  <X class="h-4 w-4" />
                  <span>Dismiss</span>
                </button>
              </div>
            </div>

            <div v-else-if="message.proposalStatus === 'accepted'" class="mt-3">
              <div class="alert alert-success">
                <Check class="h-5 w-5" />
                <span>Changes accepted</span>
              </div>
            </div>

            <div v-else-if="message.proposalStatus === 'dismissed'" class="mt-3">
              <div class="alert">
                <X class="h-5 w-5" />
                <span>Proposal dismissed</span>
              </div>
            </div>
          </div>
          <p v-if="!messages.length" class="text-light">No messages yet. Ask for examples to start.</p>
        </div>

        <div class="flex items-start gap-2">
          <textarea
            v-model="input"
            class="textarea flex-1"
            rows="2"
            placeholder='e.g., "Give three short examples for this card"'
            :disabled="sending"
            @keydown.enter.exact.prevent="sendMessage"
          ></textarea>
          <button class="btn btn-primary gap-2" type="button" :disabled="sending" @click="sendMessage">
            <Loader2 v-if="sending" class="h-4 w-4 animate-spin" />
            <Send v-else class="h-4 w-4" />
            <span>{{ sending ? 'Sending' : 'Send' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
