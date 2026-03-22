/**
 * =============================================================================
 * Homura SDK - DOM Analyzer
 * =============================================================================
 *
 * Analyzes DOM structure to identify containers, anchors, and build selectors.
 * This module requires a browser environment (window, document, CSS).
 */

import type {
  ElementAnalysis,
  ContainerType,
  AnchorCandidate,
  AncestorInfo,
} from './types.js';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// Export a flag for runtime environment checking
export const BROWSER_REQUIRED = true;

// Attributes that typically contain unique identifiers
const UNIQUE_ATTRIBUTES = ['id', 'data-id', 'data-testid', 'data-key', 'name'];

// Semantic attributes for selectors
const SEMANTIC_ATTRIBUTES = ['role', 'aria-label', 'title', 'data-testid'];

// =============================================================================
// LOW-ENTROPY WORD BLACKLIST (High Frequency, Low Distinctiveness)
// =============================================================================

/**
 * Common words that appear repeatedly across rows and have low distinctiveness.
 * These are penalized as anchors unless no better option exists.
 */
const LOW_ENTROPY_WORDS = new Set([
  // Status labels
  'pending', 'approved', 'rejected', 'active', 'inactive', 'completed', 'processing',
  'success', 'failed', 'error', 'warning', 'info', 'done', 'cancelled', 'expired',
  'open', 'closed', 'draft', 'published', 'archived',
  // Actions
  'edit', 'delete', 'remove', 'add', 'save', 'cancel', 'submit', 'confirm', 'approve',
  'reject', 'view', 'details', 'more', 'expand', 'collapse', 'refresh', 'update',
  'download', 'upload', 'export', 'import', 'copy', 'share', 'print',
  // Common labels
  'status', 'action', 'actions', 'name', 'date', 'time', 'type', 'category',
  'description', 'notes', 'comment', 'comments', 'amount', 'total', 'price', 'quantity',
  'yes', 'no', 'true', 'false', 'n/a', '-', '—', '...', '•',
  // Numbers and symbols
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
]);

/**
 * Check if text is a low-entropy word (common action/status)
 */
function isLowEntropyText(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  return LOW_ENTROPY_WORDS.has(normalized) || normalized.length <= 2;
}

// =============================================================================
// SIBLING CONTAINER ANALYSIS (Inter-row Uniqueness)
// =============================================================================

/**
 * Get sibling containers for cross-row uniqueness validation.
 * Samples up to maxSiblings containers to avoid performance issues.
 */
function getSiblingContainers(container: HTMLElement, maxSiblings = 6): HTMLElement[] {
  const parent = container.parentElement;
  if (!parent) return [];

  const siblings = Array.from(parent.children).filter(
    child => child.tagName === container.tagName && child !== container
  ) as HTMLElement[];

  if (siblings.length <= maxSiblings) {
    return siblings;
  }

  // Sample: first 3 + last 3
  const half = Math.floor(maxSiblings / 2);
  return [
    ...siblings.slice(0, half),
    ...siblings.slice(-half),
  ];
}

/**
 * Count how many sibling containers contain an element with matching text/attribute.
 */
function countSiblingMatches(
  siblings: HTMLElement[],
  selector: string,
  matchType: 'text' | 'attribute',
  matchValue: string,
  attributeName?: string
): number {
  let count = 0;

  for (const sibling of siblings) {
    try {
      const element = sibling.querySelector(selector);
      if (!element) continue;

      if (matchType === 'text') {
        const text = getDirectTextContent(element as HTMLElement);
        if (text && text.toLowerCase().trim() === matchValue.toLowerCase().trim()) {
          count++;
        }
      } else if (matchType === 'attribute' && attributeName) {
        const attrValue = element.getAttribute(attributeName);
        if (attrValue === matchValue) {
          count++;
        }
      }
    } catch {
      continue;
    }
  }

  return count;
}

/**
 * Calculate uniqueness score based on sibling frequency.
 */
function calculateUniquenessScore(siblingFrequency: number, totalSiblings: number): number {
  if (totalSiblings === 0) return 1.0;
  if (siblingFrequency === 0) return 1.0;

  const ratio = siblingFrequency / totalSiblings;
  return Math.max(0.1, 1.0 - (ratio * 0.9));
}

// Patterns for identifying semantic class names (stable container identifiers)
const SEMANTIC_CLASS_PATTERNS = [
  /^(search|header|footer|nav|sidebar|content|main|form|modal|dialog|toolbar|menu)/i,
  /(-bar|-box|-panel|-container|-wrapper|-section|-area|-card|-item|-group|-block)$/i,
  /^(btn-group|input-group|form-group|card-body|card-header|list-group)/i,
];

// =============================================================================
// PATH-BASED SELECTOR: Class Name Evaluation
// =============================================================================

/**
 * Class names that are too generic and should be skipped
 */
const SKIP_CLASS_PATTERNS = [
  /^(input|box|item|btn|icon|text|title|label|wrapper|container|content)$/i,
  /^[a-z]{1,2}$/i,
  /^\d+$/,
  /^(el-|ant-|van-|v-|ng-|react-|vue-)/i,
  /^(is-|has-|active|hover|focus|selected|disabled|loading)/i,
  /^_/,
  /\d{5,}/,
];

/**
 * Check if a CSS class name is safe to use in selectors.
 */
function isSafeCssClass(className: string): boolean {
  if (className.match(/\d{5,}|active|hover|focus|selected|disabled|ng-|vue-|react-/i)) {
    return false;
  }

  // Filter out Tailwind special patterns
  if (/[\[\]():\/]/.test(className)) {
    return false;
  }

  return true;
}

/**
 * Class name patterns with semantic meaning (higher = better)
 */
const SEMANTIC_SCORE_PATTERNS: Array<{ pattern: RegExp; score: number }> = [
  { pattern: /^(official|custom|primary|main|secondary)/i, score: 0.9 },
  { pattern: /(-header|-footer|-sidebar|-content|-main)$/i, score: 0.9 },
  { pattern: /^(header|footer|sidebar|navigation|breadcrumb)/i, score: 0.85 },
  { pattern: /(-search|-login|-register|-checkout|-cart|-profile)/i, score: 0.85 },
  { pattern: /(-form|-modal|-dialog|-popup|-dropdown)/i, score: 0.8 },
  { pattern: /(-bar|-panel|-section|-area|-zone)/i, score: 0.75 },
  { pattern: /(-card|-list|-table|-grid)/i, score: 0.7 },
  { pattern: /(-group|-block|-row|-col)/i, score: 0.6 },
  { pattern: /(-inner|-outer|-wrapper|-container)$/i, score: 0.4 },
];

/**
 * Global container IDs that should be avoided as roots
 */
const GLOBAL_CONTAINER_IDS = ['app', 'root', 'main', 'content', '__next', '__nuxt'];

/**
 * Calculate semantic score for a class name (0-1)
 */
function calculateClassSemanticScore(className: string): number {
  if (SKIP_CLASS_PATTERNS.some(pattern => pattern.test(className))) {
    return 0;
  }

  for (const { pattern, score } of SEMANTIC_SCORE_PATTERNS) {
    if (pattern.test(className)) {
      return score;
    }
  }

  if (className.includes('-') && className.length > 5) {
    return 0.3;
  }

  return 0.1;
}

/**
 * Calculate overall semantic score for an element
 */
function calculateElementSemanticScore(element: HTMLElement): number {
  const classes = Array.from(element.classList);

  if (classes.length === 0) {
    if (element.id && !GLOBAL_CONTAINER_IDS.includes(element.id.toLowerCase())) {
      if (!element.id.match(/\d{5,}|uid|uuid|random/i)) {
        return 0.85;
      }
    }
    return 0;
  }

  const scores = classes.map(calculateClassSemanticScore);
  return Math.max(...scores);
}

/**
 * Analyze an element and extract selector-relevant information.
 * This function requires a browser environment.
 */
export function analyzeElement(element: HTMLElement): ElementAnalysis {
  if (!isBrowser) {
    throw new Error('[Homura SDK] analyzeElement requires a browser environment (window, document)');
  }

  // 1. Find repeating container
  const repeatingContainer = findRepeatingContainer(element);

  // 2. Find semantic container
  const semanticContainer = findSemanticContainer(element);

  // 3. Use the more specific one
  const container = repeatingContainer || semanticContainer;

  // 4. Determine container type
  const containerType = container ? detectContainerType(container) : 'single';

  // 5. Find anchor candidates
  const anchorCandidates = container
    ? findAnchorCandidates(container)
    : [];

  // 6. Build relative selector
  const relativeSelector = container
    ? buildRelativeSelector(element, container)
    : '';

  // 7. Build minimal selector
  const targetSelector = buildMinimalSelector(element, container || undefined);

  // 8. Build serializable container info
  const containerSelector = container ? buildMinimalSelector(container) : undefined;
  const containerTagName = container ? container.tagName.toLowerCase() : undefined;

  // 9. Build scoped selector
  const scopedSelector = containerSelector
    ? `${containerSelector} ${targetSelector}`
    : targetSelector;

  const minimalSelector = scopedSelector;

  // 10. Collect ancestor path
  const ancestorPath = collectAncestorPath(element);
  const pathSelector = buildPathSelector(ancestorPath, targetSelector);

  return {
    target: element,
    container,
    containerType,
    anchorCandidates,
    relativeSelector,
    minimalSelector,
    containerSelector,
    containerTagName,
    targetSelector,
    scopedSelector,
    semanticContainer,
    ancestorPath,
    pathSelector,
  };
}

// =============================================================================
// PATH-BASED SELECTOR: Ancestor Path Collection
// =============================================================================

/**
 * Collect ancestor path from target element upward to semantic root
 */
export function collectAncestorPath(element: HTMLElement, maxDepth = 6): AncestorInfo[] {
  if (!isBrowser) {
    throw new Error('[Homura SDK] collectAncestorPath requires a browser environment');
  }

  const path: AncestorInfo[] = [];
  let current = element.parentElement;
  let depth = 0;

  while (current && current !== document.body && depth < maxDepth) {
    const semanticScore = calculateElementSemanticScore(current);
    const classes = Array.from(current.classList);
    const id = current.id && !GLOBAL_CONTAINER_IDS.includes(current.id.toLowerCase())
      ? current.id
      : undefined;

    const isSemanticRoot = semanticScore >= 0.7 ||
      (id !== undefined && !id.match(/\d{5,}|uid|uuid|random/i));

    const selector = buildAncestorSelector(current);
    const outerHTML = truncateOuterHTML(current, 300);

    path.push({
      tagName: current.tagName.toLowerCase(),
      id,
      classes,
      semanticScore,
      selector,
      outerHTML,
      depth,
      isSemanticRoot,
    });

    if (isSemanticRoot) {
      break;
    }

    current = current.parentElement;
    depth++;
  }

  return path;
}

/**
 * Build selector for an ancestor element
 */
function buildAncestorSelector(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();

  if (element.id && !element.id.match(/\d{5,}|uid|uuid|random/i)) {
    if (!GLOBAL_CONTAINER_IDS.includes(element.id.toLowerCase())) {
      return `#${CSS.escape(element.id)}`;
    }
  }

  const testId = element.getAttribute('data-testid');
  if (testId) {
    return `[data-testid="${testId}"]`;
  }

  const classes = Array.from(element.classList);
  const scoredClasses = classes
    .filter(isSafeCssClass)
    .map(c => ({ cls: c, score: calculateClassSemanticScore(c) }))
    .filter(x => x.score >= 0.5)
    .sort((a, b) => b.score - a.score);

  if (scoredClasses.length > 0) {
    return `${tag}.${scoredClasses[0].cls}`;
  }

  const validClasses = classes.filter(c =>
    isSafeCssClass(c) &&
    !SKIP_CLASS_PATTERNS.some(pattern => pattern.test(c))
  );
  if (validClasses.length > 0) {
    return `${tag}.${validClasses[0]}`;
  }

  return tag;
}

/**
 * Truncate outerHTML for serialization
 */
function truncateOuterHTML(element: HTMLElement, maxLength: number): string {
  const html = element.outerHTML;
  if (html.length <= maxLength) {
    return html;
  }

  const closeTagStart = html.indexOf('>');
  if (closeTagStart > 0 && closeTagStart < maxLength - 10) {
    return html.substring(0, closeTagStart + 1) + '...';
  }

  return html.substring(0, maxLength) + '...';
}

/**
 * Build path-based selector from ancestor path
 */
export function buildPathSelector(ancestorPath: AncestorInfo[], targetSelector: string): string {
  if (ancestorPath.length === 0) {
    return targetSelector;
  }

  let rootIndex = ancestorPath.findIndex(a => a.isSemanticRoot);
  if (rootIndex === -1) {
    let maxScore = 0;
    ancestorPath.forEach((a, i) => {
      if (a.semanticScore > maxScore) {
        maxScore = a.semanticScore;
        rootIndex = i;
      }
    });
  }

  if (rootIndex === -1 || ancestorPath[rootIndex].semanticScore < 0.3) {
    return targetSelector;
  }

  const parts: string[] = [];
  parts.push(ancestorPath[rootIndex].selector);

  for (let i = rootIndex - 1; i >= 0; i--) {
    const ancestor = ancestorPath[i];
    if (ancestor.semanticScore >= 0.5) {
      parts.push(ancestor.selector);
    }
  }

  parts.push(targetSelector);

  return parts.join(' ');
}

const SKIP_AS_CONTAINER = ['TD', 'TH', 'SPAN', 'STRONG', 'EM', 'B', 'I', 'LABEL'];
const PREFERRED_CONTAINERS = ['TR', 'LI', 'ARTICLE', 'SECTION'];
const VALID_GRID_ITEMS = ['A', 'DIV', 'ARTICLE', 'SECTION', 'LI'];

/**
 * Check if an element is a CSS Grid or Flex container
 */
function isGridOrFlexContainer(element: HTMLElement | null): boolean {
  if (!element) return false;

  const className = element.className || '';
  if (/\b(grid|flex)\b/.test(className) || /grid-cols-/.test(className)) {
    return true;
  }

  try {
    const style = window.getComputedStyle(element);
    return style.display === 'grid' || style.display === 'flex';
  } catch {
    return false;
  }
}

/**
 * Check if an element is a button toolbar/group container
 */
function isButtonToolbar(element: HTMLElement | null): boolean {
  if (!element) return false;

  const className = element.className || '';
  return /\b(btn-group|buttons|toolbar|btn-toolbar|actions|button-group|bh-buttons)\b/i.test(className);
}

/**
 * Find the nearest repeating container
 */
export function findRepeatingContainer(element: HTMLElement): HTMLElement | null {
  const elementParent = element.parentElement;
  if (elementParent) {
    const elementSiblings = Array.from(elementParent.children).filter(child => {
      if (child.tagName !== element.tagName) return false;
      if (['A', 'DIV'].includes(child.tagName)) {
        const elementClasses = new Set(element.className.split(/\s+/));
        const childClasses = new Set((child as HTMLElement).className.split(/\s+/));
        const overlap = [...elementClasses].filter(c => childClasses.has(c)).length;
        return overlap >= Math.min(elementClasses.size, childClasses.size) * 0.5;
      }
      return true;
    });

    if (elementSiblings.length >= 2) {
      if (isGridOrFlexContainer(elementParent) && VALID_GRID_ITEMS.includes(element.tagName)) {
        return element;
      }
      if (PREFERRED_CONTAINERS.includes(element.tagName)) {
        return element;
      }
      if (!SKIP_AS_CONTAINER.includes(element.tagName)) {
        if (element.tagName === 'A' && isButtonToolbar(elementParent)) {
          // Skip
        } else {
          return element;
        }
      }
    }
  }

  let current = element.parentElement;
  let foundCandidate: HTMLElement | null = null;

  while (current && current !== document.body) {
    const parent = current.parentElement;
    if (!parent) break;

    const siblings = Array.from(parent.children).filter(child => {
      if (child.tagName !== current!.tagName) return false;
      if (child.tagName === 'DIV') {
        const currentClasses = new Set(current!.className.split(/\s+/));
        const childClasses = new Set((child as HTMLElement).className.split(/\s+/));
        const overlap = [...currentClasses].filter(c => childClasses.has(c)).length;
        return overlap >= Math.min(currentClasses.size, childClasses.size) * 0.5;
      }
      return true;
    });

    if (siblings.length >= 2) {
      if (isGridOrFlexContainer(parent) && VALID_GRID_ITEMS.includes(current.tagName)) {
        return current;
      }

      if (SKIP_AS_CONTAINER.includes(current.tagName)) {
        if (!foundCandidate) {
          foundCandidate = current;
        }
        current = parent;
        continue;
      }

      if (PREFERRED_CONTAINERS.includes(current.tagName)) {
        return current;
      }

      return current;
    }

    current = parent;
  }

  return foundCandidate;
}

/**
 * Find the nearest ancestor with semantic class/id
 */
export function findSemanticContainer(element: HTMLElement): HTMLElement | null {
  let current = element.parentElement;

  while (current && current !== document.body) {
    if (current.id && !current.id.match(/\d{5,}|uid|uuid|random|react|vue|ng-/i)) {
      return current;
    }

    if (current.getAttribute('data-testid')) {
      return current;
    }

    const hasSemanticClass = Array.from(current.classList).some(cls =>
      SEMANTIC_CLASS_PATTERNS.some(pattern => pattern.test(cls))
    );

    if (hasSemanticClass) {
      return current;
    }

    const semanticTags = ['FORM', 'NAV', 'HEADER', 'FOOTER', 'ASIDE', 'MAIN', 'SECTION', 'ARTICLE'];
    if (semanticTags.includes(current.tagName) && current.classList.length > 0) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

/**
 * Detect the type of container
 */
function detectContainerType(container: HTMLElement): ContainerType {
  const tag = container.tagName;

  if (tag === 'TR') return 'table';
  if (tag === 'LI') return 'list';

  const parent = container.parentElement;
  if (parent) {
    const style = window.getComputedStyle(parent);
    if (style.display === 'grid') return 'grid';
    if (style.display === 'flex') return 'grid';
  }

  if (container.classList.toString().match(/card|item|row/i)) {
    return 'card';
  }

  return 'grid';
}

/**
 * Find anchor candidates within a container
 */
export function findAnchorCandidates(container: HTMLElement): AnchorCandidate[] {
  const candidates: AnchorCandidate[] = [];

  const siblings = getSiblingContainers(container);
  const hasSiblings = siblings.length > 0;

  const textElements = container.querySelectorAll('*');
  const textsFound = new Map<string, HTMLElement>();

  textElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    const directText = getDirectTextContent(htmlEl);

    if (directText && directText.length >= 2 && directText.length <= 100) {
      if (!textsFound.has(directText)) {
        textsFound.set(directText, htmlEl);
      }
    }
  });

  textsFound.forEach((el, text) => {
    const selector = buildMinimalSelector(el, container);
    let confidence = calculateTextConfidence(el, text);
    let isUnique = false;

    if (isLowEntropyText(text)) {
      confidence *= 0.3;
    }

    let siblingFrequency = 0;
    const isLowEntropy = isLowEntropyText(text);

    if (hasSiblings) {
      siblingFrequency = countSiblingMatches(siblings, selector, 'text', text);
      const uniquenessScore = calculateUniquenessScore(siblingFrequency, siblings.length);

      isUnique = siblingFrequency === 0;
      confidence *= uniquenessScore;

      if (isUnique) {
        confidence = Math.min(1.0, confidence + 0.3);
      }
    } else {
      isUnique = isLikelyUnique(text);
      if (isUnique) {
        confidence += 0.1;
      }
    }

    candidates.push({
      selector,
      type: 'text_match',
      text,
      confidence: Math.min(1.0, confidence),
      isUnique,
      siblingFrequency: hasSiblings ? siblingFrequency : undefined,
      isLowEntropy,
    });
  });

  textElements.forEach(el => {
    if (el === container) return;

    for (const attr of SEMANTIC_ATTRIBUTES) {
      const value = el.getAttribute(attr);
      if (value && value.length > 2) {
        const selector = buildMinimalSelector(el as HTMLElement, container);
        let confidence = 0.6;
        let isUnique = false;

        const isLowEntropy = isLowEntropyText(value);
        if (isLowEntropy) {
          confidence *= 0.3;
        }

        let siblingFrequency = 0;
        if (hasSiblings) {
          siblingFrequency = countSiblingMatches(siblings, selector, 'attribute', value, attr);
          const uniquenessScore = calculateUniquenessScore(siblingFrequency, siblings.length);

          isUnique = siblingFrequency === 0;
          confidence *= uniquenessScore;

          if (isUnique) {
            confidence = Math.min(1.0, confidence + 0.2);
          }
        }

        candidates.push({
          selector,
          type: 'attribute_match',
          attribute: { name: attr, value },
          confidence: Math.min(1.0, confidence),
          isUnique,
          siblingFrequency: hasSiblings ? siblingFrequency : undefined,
          isLowEntropy,
        });
      }
    }
  });

  for (const attr of UNIQUE_ATTRIBUTES) {
    const value = container.getAttribute(attr);
    if (value) {
      candidates.push({
        selector: `[${attr}]`,
        type: 'attribute_match',
        attribute: { name: attr, value },
        confidence: 0.2,
        isUnique: false,
      });
    }
  }

  const sorted = candidates.sort((a, b) => {
    if (a.isUnique !== b.isUnique) {
      return a.isUnique ? -1 : 1;
    }

    if (a.type !== b.type) {
      return a.type === 'text_match' ? -1 : 1;
    }

    return b.confidence - a.confidence;
  });

  return sorted.slice(0, 5);
}

/**
 * Get direct text content of an element
 */
function getDirectTextContent(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  Array.from(clone.children).forEach(child => child.remove());
  return clone.textContent?.trim() || '';
}

/**
 * Calculate confidence score for a text anchor
 */
function calculateTextConfidence(element: HTMLElement, text: string): number {
  let score = 0.5;

  if (['H1', 'H2', 'H3', 'A', 'LABEL', 'SPAN'].includes(element.tagName)) {
    score += 0.1;
  }

  if (element.className.match(/name|title|label|id|key/i)) {
    score += 0.15;
  }

  if (element.parentElement?.firstElementChild === element) {
    score += 0.1;
  }

  if (text.length >= 3 && text.length <= 50) {
    score += 0.1;
  }

  return Math.min(score, 1);
}

/**
 * Check if text is likely a unique identifier
 */
function isLikelyUnique(text: string): boolean {
  if (/^[A-Z0-9\-_]+$/i.test(text)) return true;
  if (/\d{3,}/.test(text)) return true;
  if (text.length <= 30 && /^[\u4e00-\u9fa5a-zA-Z\s]+$/.test(text)) return true;

  return false;
}

/**
 * Build a minimal CSS selector for an element
 */
export function buildMinimalSelector(
  element: HTMLElement,
  context?: HTMLElement
): string {
  const tag = element.tagName.toLowerCase();
  const parent = context || element.parentElement;

  if (element.id && !element.id.match(/\d{5,}|uid|uuid|random|react|vue/i)) {
    return `#${CSS.escape(element.id)}`;
  }

  const testId = element.getAttribute('data-testid');
  if (testId) {
    return `[data-testid="${testId}"]`;
  }

  const name = element.getAttribute('name');
  if (name && !name.match(/\d{5,}/)) {
    return `${tag}[name="${name}"]`;
  }

  const stableClasses = Array.from(element.classList)
    .filter(isSafeCssClass)
    .slice(0, 2);

  let baseSelector = tag;

  if (stableClasses.length > 0) {
    baseSelector = `${tag}.${stableClasses.join('.')}`;
  } else {
    const role = element.getAttribute('role');
    if (role) {
      baseSelector = `${tag}[role="${role}"]`;
    } else {
      const type = element.getAttribute('type');
      if (type && ['button', 'submit', 'text', 'checkbox', 'radio', 'email', 'password'].includes(type)) {
        baseSelector = `${tag}[type="${type}"]`;
      }
    }
  }

  if (parent) {
    try {
      const matches = parent.querySelectorAll(`:scope > ${baseSelector}`);
      if (matches.length > 1) {
        const index = Array.from(matches).indexOf(element) + 1;
        if (index > 0) {
          return `${baseSelector}:nth-of-type(${index})`;
        }
      }
    } catch {
      // Invalid selector syntax
    }
  }

  return baseSelector;
}

/**
 * Build a selector relative to a container
 */
export function buildRelativeSelector(
  target: HTMLElement,
  container: HTMLElement
): string {
  const path: string[] = [];
  let current: HTMLElement | null = target;

  while (current && current !== container) {
    const selector = buildMinimalSelector(current, container);
    path.unshift(selector);
    current = current.parentElement;
  }

  if (path.length > 3) {
    return path.slice(-2).join(' > ');
  }

  return path.join(' ');
}

/**
 * Get a simplified HTML representation of an element
 */
export function getElementHtml(element: HTMLElement, maxLength: number = 200): string {
  const clone = element.cloneNode(true) as HTMLElement;

  clone.querySelectorAll('script, style').forEach(el => el.remove());

  const html = clone.outerHTML;
  if (html.length > maxLength) {
    return html.slice(0, maxLength) + '...';
  }

  return html;
}

/**
 * Get container HTML with context
 */
export function getContainerContext(container: HTMLElement, maxLength: number = 500): string {
  const parent = container.parentElement;
  if (!parent) {
    return getElementHtml(container, maxLength);
  }

  const siblings = Array.from(parent.children).slice(0, 3);
  return siblings.map(el => getElementHtml(el as HTMLElement, maxLength / 3)).join('\n');
}
