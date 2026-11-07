/**
 * Master AI technology catalogue — the single source for the technology
 * selector, feed chips and detail grouping. IDs are stable internal keys
 * (stored in project_technologies.technology_id); never rename an ID.
 *
 * Merged duplicates (one canonical entry, searchable by the other name):
 *  - "Transformers" (NLP list)  → Hugging Face Transformers (LLM + NLP)
 *  - "TTS" (Generative/Audio)   → Coqui TTS (the `TTS` package is Coqui's)
 */

export type TechCategoryId =
  | 'machine-learning'
  | 'deep-learning'
  | 'llm-frameworks'
  | 'agent-frameworks'
  | 'computer-vision'
  | 'nlp'
  | 'generative-audio'
  | 'training-finetuning'
  | 'rag-vector'
  | 'reinforcement-learning'
  | 'graph-ml'
  | 'serving-deployment';

/** Category id used for developer-entered technologies. */
export const CUSTOM_CATEGORY_ID = 'custom';
export const CUSTOM_CATEGORY_LABEL = 'Custom Technologies';

export interface TechCategory {
  id: TechCategoryId;
  label: string;
}

export interface Technology {
  id: string;
  name: string;
  /** First entry is the primary category (used for grouping on details). */
  categories: TechCategoryId[];
  /** Other names that should match in search / dedupe. */
  aliases?: string[];
}

export const TECH_CATEGORIES: TechCategory[] = [
  { id: 'machine-learning', label: 'Machine Learning' },
  { id: 'deep-learning', label: 'Deep Learning' },
  { id: 'llm-frameworks', label: 'LLM Application Frameworks' },
  { id: 'agent-frameworks', label: 'AI Agent Frameworks' },
  { id: 'computer-vision', label: 'Computer Vision' },
  { id: 'nlp', label: 'Natural Language Processing' },
  { id: 'generative-audio', label: 'Generative AI & Audio' },
  { id: 'training-finetuning', label: 'Model Training & Fine-tuning' },
  { id: 'rag-vector', label: 'RAG & Vector Search' },
  { id: 'reinforcement-learning', label: 'Reinforcement Learning' },
  { id: 'graph-ml', label: 'Graph Machine Learning' },
  { id: 'serving-deployment', label: 'Model Serving & Deployment' },
];

const t = (
  id: string,
  name: string,
  categories: TechCategoryId[],
  aliases?: string[]
): Technology => ({ id, name, categories, aliases });

export const TECHNOLOGIES: Technology[] = [
  // A. Machine Learning
  t('scikit-learn', 'Scikit-learn', ['machine-learning'], ['sklearn']),
  t('xgboost', 'XGBoost', ['machine-learning']),
  t('lightgbm', 'LightGBM', ['machine-learning']),
  t('catboost', 'CatBoost', ['machine-learning']),
  t('h2o-ai', 'H2O.ai', ['machine-learning'], ['H2O']),
  t('statsmodels', 'Statsmodels', ['machine-learning']),
  t('river', 'River', ['machine-learning']),
  t('ml-net', 'ML.NET', ['machine-learning']),

  // B. Deep Learning
  t('pytorch', 'PyTorch', ['deep-learning'], ['torch']),
  t('tensorflow', 'TensorFlow', ['deep-learning']),
  t('keras', 'Keras', ['deep-learning']),
  t('jax', 'JAX', ['deep-learning']),
  t('paddlepaddle', 'PaddlePaddle', ['deep-learning']),
  t('mindspore', 'MindSpore', ['deep-learning']),
  t('apache-mxnet', 'Apache MXNet', ['deep-learning'], ['MXNet']),
  t('pytorch-lightning', 'PyTorch Lightning', ['deep-learning'], ['Lightning']),

  // C. LLM Application Frameworks
  t('langchain', 'LangChain', ['llm-frameworks']),
  t('llamaindex', 'LlamaIndex', ['llm-frameworks']),
  t('haystack', 'Haystack', ['llm-frameworks']),
  t('semantic-kernel', 'Semantic Kernel', ['llm-frameworks']),
  t('dspy', 'DSPy', ['llm-frameworks']),
  t('hf-transformers', 'Hugging Face Transformers', ['llm-frameworks', 'nlp'], ['Transformers']),
  t('guidance', 'Guidance', ['llm-frameworks']),
  t('outlines', 'Outlines', ['llm-frameworks']),
  t('vercel-ai-sdk', 'Vercel AI SDK', ['llm-frameworks']),

  // D. AI Agent Frameworks
  t('langgraph', 'LangGraph', ['agent-frameworks']),
  t('crewai', 'CrewAI', ['agent-frameworks']),
  t('microsoft-autogen', 'Microsoft AutoGen', ['agent-frameworks'], ['AutoGen']),
  t('openai-agents-sdk', 'OpenAI Agents SDK', ['agent-frameworks']),
  t('google-adk', 'Google Agent Development Kit (ADK)', ['agent-frameworks'], ['ADK']),
  t('pydanticai', 'PydanticAI', ['agent-frameworks'], ['Pydantic AI']),
  t('agno', 'Agno', ['agent-frameworks']),
  t('llamaindex-workflows', 'LlamaIndex Workflows', ['agent-frameworks']),
  t('strands-agents', 'Strands Agents', ['agent-frameworks']),
  t('smolagents', 'smolagents', ['agent-frameworks']),
  t('openhands', 'OpenHands', ['agent-frameworks']),

  // E. Computer Vision
  t('opencv', 'OpenCV', ['computer-vision']),
  t('ultralytics-yolo', 'Ultralytics YOLO', ['computer-vision'], ['YOLO']),
  t('detectron2', 'Detectron2', ['computer-vision']),
  t('mmdetection', 'MMDetection', ['computer-vision']),
  t('mmcv', 'MMCV', ['computer-vision']),
  t('kornia', 'Kornia', ['computer-vision']),
  t('mediapipe', 'MediaPipe', ['computer-vision']),
  t('torchvision', 'TorchVision', ['computer-vision']),
  t('segment-anything', 'Segment Anything (SAM)', ['computer-vision'], ['SAM']),

  // F. Natural Language Processing (Transformers → hf-transformers above)
  t('spacy', 'spaCy', ['nlp']),
  t('nltk', 'NLTK', ['nlp']),
  t('stanza', 'Stanza', ['nlp']),
  t('flair', 'Flair', ['nlp']),
  t('gensim', 'Gensim', ['nlp']),
  t('hf-tokenizers', 'Hugging Face Tokenizers', ['nlp'], ['Tokenizers']),

  // G. Generative AI & Audio (TTS → coqui-tts)
  t('hf-diffusers', 'Hugging Face Diffusers', ['generative-audio'], ['Diffusers']),
  t('comfyui', 'ComfyUI', ['generative-audio']),
  t('onnx-runtime', 'ONNX Runtime', ['generative-audio'], ['ONNX']),
  t('coqui-tts', 'Coqui TTS', ['generative-audio'], ['TTS']),
  t('whisper', 'Whisper', ['generative-audio']),
  t('espnet', 'ESPnet', ['generative-audio']),
  t('audiocraft', 'AudioCraft', ['generative-audio']),

  // H. Model Training & Fine-tuning
  t('hf-peft', 'Hugging Face PEFT', ['training-finetuning'], ['PEFT']),
  t('trl', 'TRL', ['training-finetuning']),
  t('deepspeed', 'DeepSpeed', ['training-finetuning']),
  t('ray-train', 'Ray Train', ['training-finetuning']),
  t('axolotl', 'Axolotl', ['training-finetuning']),
  t('unsloth', 'Unsloth', ['training-finetuning']),
  t('megatron-lm', 'Megatron-LM', ['training-finetuning'], ['Megatron']),

  // I. RAG & Vector Search
  t('chroma', 'Chroma', ['rag-vector'], ['ChromaDB']),
  t('pinecone', 'Pinecone', ['rag-vector']),
  t('weaviate', 'Weaviate', ['rag-vector']),
  t('milvus', 'Milvus', ['rag-vector']),
  t('qdrant', 'Qdrant', ['rag-vector']),
  t('faiss', 'FAISS', ['rag-vector']),

  // J. Reinforcement Learning
  t('gymnasium', 'Gymnasium', ['reinforcement-learning'], ['Gym']),
  t('stable-baselines3', 'Stable-Baselines3', ['reinforcement-learning'], ['SB3']),
  t('rllib', 'RLlib', ['reinforcement-learning']),
  t('cleanrl', 'CleanRL', ['reinforcement-learning']),
  t('acme', 'Acme', ['reinforcement-learning']),
  t('tianshou', 'Tianshou', ['reinforcement-learning']),

  // K. Graph Machine Learning
  t('pytorch-geometric', 'PyTorch Geometric', ['graph-ml'], ['PyG']),
  t('dgl', 'DGL', ['graph-ml']),
  t('networkx', 'NetworkX', ['graph-ml']),
  t('graphlearn', 'GraphLearn', ['graph-ml']),
  t('spektral', 'Spektral', ['graph-ml']),

  // L. Model Serving & Deployment
  t('bentoml', 'BentoML', ['serving-deployment']),
  t('kserve', 'KServe', ['serving-deployment']),
  t('ray-serve', 'Ray Serve', ['serving-deployment']),
  t('vllm', 'vLLM', ['serving-deployment']),
  t('sglang', 'SGLang', ['serving-deployment']),
  t('triton-inference-server', 'Triton Inference Server', ['serving-deployment'], ['Triton']),
  t('mlflow', 'MLflow', ['serving-deployment']),
  t('kubeflow', 'Kubeflow', ['serving-deployment']),
];

// ---------------------------------------------------------------------------
// Lookups & helpers
// ---------------------------------------------------------------------------

export const TECHNOLOGY_BY_ID: Record<string, Technology> = Object.fromEntries(
  TECHNOLOGIES.map((tech) => [tech.id, tech])
);

export const CATEGORY_LABEL: Record<string, string> = {
  ...Object.fromEntries(TECH_CATEGORIES.map((c) => [c.id, c.label])),
  [CUSTOM_CATEGORY_ID]: CUSTOM_CATEGORY_LABEL,
};

export const normalizeTechName = (name: string): string =>
  name.trim().replace(/\s+/g, ' ').toLowerCase();

/** Case-insensitive lookup by name or alias. */
const BY_NAME: Record<string, Technology> = {};
for (const tech of TECHNOLOGIES) {
  for (const n of [tech.name, ...(tech.aliases ?? [])]) BY_NAME[normalizeTechName(n)] = tech;
}
export const findTechnologyByName = (name: string): Technology | undefined =>
  BY_NAME[normalizeTechName(name)];

/** A selection in the form (catalogue entry or developer-entered). */
export interface SelectedTechnology {
  id: string;
  name: string;
  category: string;
  isCustom: boolean;
}

export const CUSTOM_TECH_MAX_LENGTH = 60;
export const MAX_TECHNOLOGIES = 25;

export const customTechId = (name: string): string => `custom:${normalizeTechName(name)}`;

export const toSelected = (tech: Technology): SelectedTechnology => ({
  id: tech.id,
  name: tech.name,
  category: tech.categories[0],
  isCustom: false,
});

/**
 * Validates a custom entry against the catalogue and current selection.
 * Returns the cleaned selection, or an error message.
 */
export const makeCustomTechnology = (
  raw: string,
  current: SelectedTechnology[]
): { value: SelectedTechnology | null; error: string | null } => {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return { value: null, error: 'Enter a technology name.' };
  if (name.length > CUSTOM_TECH_MAX_LENGTH) {
    return { value: null, error: `Keep it under ${CUSTOM_TECH_MAX_LENGTH} characters.` };
  }
  const known = findTechnologyByName(name);
  if (known) {
    return {
      value: null,
      error: current.some((s) => s.id === known.id)
        ? `${known.name} is already selected.`
        : `${known.name} is already in the list — select it there instead.`,
    };
  }
  const id = customTechId(name);
  if (current.some((s) => s.id === id)) {
    return { value: null, error: `${name} is already added.` };
  }
  return { value: { id, name, category: CUSTOM_CATEGORY_ID, isCustom: true }, error: null };
};

/**
 * Human-readable summary kept in repositories.framework for backward
 * compatibility (legacy display, search, filter chips, older app builds).
 */
export const FRAMEWORK_SUMMARY_MAX = 120;
export const buildFrameworkSummary = (selected: SelectedTechnology[]): string => {
  const names = selected.map((s) => s.name);
  let summary = '';
  for (let i = 0; i < names.length; i++) {
    const rest = names.length - i - 1;
    const next = summary ? `${summary}, ${names[i]}` : names[i];
    const suffix = rest > 0 ? ` +${rest}` : '';
    if ((next + suffix).length > FRAMEWORK_SUMMARY_MAX && summary) {
      return `${summary} +${names.length - i}`;
    }
    summary = next;
  }
  return summary;
};

/**
 * Prefill for editing a legacy project that has only the free-text framework
 * value: a catalogue match becomes that entry, anything else a custom entry.
 * Only used to seed the editor — nothing is saved until the owner saves.
 */
export const selectionFromLegacyFramework = (framework: string | null | undefined): SelectedTechnology[] => {
  const value = (framework || '').trim();
  if (!value) return [];
  const known = findTechnologyByName(value);
  if (known) return [toSelected(known)];
  const custom = makeCustomTechnology(value, []);
  return custom.value ? [custom.value] : [];
};
