/**
 * =============================================================================
 * Homura - DOM Analyzer
 * =============================================================================
 * 
 * Analyzes DOM structure to identify containers, anchors, and build selectors
 */

import type { 
  ElementAnalysis, 
  ContainerType, 
  AnchorCandidate,
  AncestorInfo,
} from './types';

// Attributes that typically contain unique identifiers
const UNIQUE_ATTRIBUTES = ['id', 'data-id', 'data-testid', 'data-key', 'name'];

// Semantic attributes for selectors
const SEMANTIC_ATTRIBUTES = ['role', 'aria-label', 'title', 'data-testid'];

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
 * These don't provide stable selectors
 */
const SKIP_CLASS_PATTERNS = [
  /^(input|box|item|btn|icon|text|title|label|wrapper|container|content)$/i,  // Single generic words
  /^[a-z]{1,2}$/i,           // Single or double letters
  /^\d+$/,                   // Pure numbers
  /^(el-|ant-|van-|v-|ng-|react-|vue-)/i,  // Framework prefixes
  /^(is-|has-|active|hover|focus|selected|disabled|loading)/i,  // State classes
  /^_/,                      // Private/internal classes (start with _)
  /\d{5,}/,                  // Contains long numbers (likely generated)
];

/**
 * Class name patterns with semantic meaning (higher = better)
 */
const SEMANTIC_SCORE_PATTERNS: Array<{ pattern: RegExp; score: number }> = [
  // Layout structure (very semantic)
  { pattern: /^(official|custom|primary|main|secondary)/i, score: 0.9 },
  { pattern: /(-header|-footer|-sidebar|-content|-main)$/i, score: 0.9 },
  { pattern: /^(header|footer|sidebar|navigation|breadcrumb)/i, score: 0.85 },
  
  // Functional areas
  { pattern: /(-search|-login|-register|-checkout|-cart|-profile)/i, score: 0.85 },
  { pattern: /(-form|-modal|-dialog|-popup|-dropdown)/i, score: 0.8 },
  { pattern: /(-bar|-panel|-section|-area|-zone)/i, score: 0.75 },
  
  // Components
  { pattern: /(-card|-list|-table|-grid)/i, score: 0.7 },
  { pattern: /(-group|-block|-row|-col)/i, score: 0.6 },
  
  // Generic with some meaning
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
  // Check if should be skipped
  if (SKIP_CLASS_PATTERNS.some(pattern => pattern.test(className))) {
    return 0;
  }
  
  // Check for semantic patterns
  for (const { pattern, score } of SEMANTIC_SCORE_PATTERNS) {
    if (pattern.test(className)) {
      return score;
    }
  }
  
  // Default: slightly positive if has hyphen (indicates deliberate naming)
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
    // Check for ID
    if (element.id && !GLOBAL_CONTAINER_IDS.includes(element.id.toLowerCase())) {
      if (!element.id.match(/\d{5,}|uid|uuid|random/i)) {
        return 0.85; // Stable ID
      }
    }
    return 0;
  }
  
  // Get highest score among all classes
  const scores = classes.map(calculateClassSemanticScore);
  return Math.max(...scores);
}

/**
 * Analyze an element and extract selector-relevant information
 */
export function analyzeElement(element: HTMLElement): ElementAnalysis {
  // 1. Find repeating container (for lists/tables with siblings)
  const repeatingContainer = findRepeatingContainer(element);
  
  // 2. Find semantic container (for single elements like search button)
  const semanticContainer = findSemanticContainer(element);
  
  // 3. Use the more specific one: repeating > semantic
  const container = repeatingContainer || semanticContainer;
  
  // 4. Determine container type
  const containerType = container ? detectContainerType(container) : 'single';
  
  // 5. Find anchor candidates within container
  const anchorCandidates = container 
    ? findAnchorCandidates(container) 
    : [];
  
  // 6. Build relative selector (from container to target)
  const relativeSelector = container
    ? buildRelativeSelector(element, container)
    : '';
  
  // 7. Build minimal selector for the element itself
  const targetSelector = buildMinimalSelector(element, container || undefined);

  // 8. Build serializable container info (for Chrome messaging)
  const containerSelector = container ? buildMinimalSelector(container) : undefined;
  const containerTagName = container ? container.tagName.toLowerCase() : undefined;

  // 9. Build scoped selector: "container target" for precise element location
  // This is the key improvement - always use container context when available
  const scopedSelector = containerSelector 
    ? `${containerSelector} ${targetSelector}`
    : targetSelector;

  // 10. For backward compatibility, minimalSelector now returns the scoped version
  const minimalSelector = scopedSelector;

  // 11. Collect ancestor path for AI-assisted selector generation
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
    // New fields for explicit scope handling
    targetSelector,
    scopedSelector,
    semanticContainer,
    // Path-based selector fields
    ancestorPath,
    pathSelector,
  };
}

// =============================================================================
// PATH-BASED SELECTOR: Ancestor Path Collection
// =============================================================================

/**
 * Collect ancestor path from target element upward to semantic root
 * 
 * This provides rich context for AI-assisted selector generation.
 * Each ancestor includes its tag, classes, semantic score, and a selector.
 * 
 * @param element - Target element
 * @param maxDepth - Maximum number of ancestors to collect (default: 6)
 * @returns Array of ancestor info, from nearest parent to root
 */
export function collectAncestorPath(element: HTMLElement, maxDepth = 6): AncestorInfo[] {
  const path: AncestorInfo[] = [];
  let current = element.parentElement;
  let depth = 0;
  
  while (current && current !== document.body && depth < maxDepth) {
    const semanticScore = calculateElementSemanticScore(current);
    const classes = Array.from(current.classList);
    const id = current.id && !GLOBAL_CONTAINER_IDS.includes(current.id.toLowerCase()) 
      ? current.id 
      : undefined;
    
    // Check if this is a good semantic root
    const isSemanticRoot = semanticScore >= 0.7 || 
      (id !== undefined && !id.match(/\d{5,}|uid|uuid|random/i));
    
    // Build best selector for this element
    const selector = buildAncestorSelector(current);
    
    // Truncate outerHTML for serialization (first 300 chars, remove inner content)
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
    
    // Stop if we found a good semantic root
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
  
  // Priority 1: Stable ID
  if (element.id && !element.id.match(/\d{5,}|uid|uuid|random/i)) {
    if (!GLOBAL_CONTAINER_IDS.includes(element.id.toLowerCase())) {
      return `#${CSS.escape(element.id)}`;
    }
  }
  
  // Priority 2: data-testid
  const testId = element.getAttribute('data-testid');
  if (testId) {
    return `[data-testid="${testId}"]`;
  }
  
  // Priority 3: Semantic class with high score
  const classes = Array.from(element.classList);
  const scoredClasses = classes
    .map(c => ({ cls: c, score: calculateClassSemanticScore(c) }))
    .filter(x => x.score >= 0.5)
    .sort((a, b) => b.score - a.score);
  
  if (scoredClasses.length > 0) {
    return `${tag}.${scoredClasses[0].cls}`;
  }
  
  // Priority 4: Any non-skipped class
  const validClasses = classes.filter(c => 
    !SKIP_CLASS_PATTERNS.some(pattern => pattern.test(c))
  );
  if (validClasses.length > 0) {
    return `${tag}.${validClasses[0]}`;
  }
  
  // Fallback: just tag
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
  
  // Try to preserve the opening tag
  const closeTagStart = html.indexOf('>');
  if (closeTagStart > 0 && closeTagStart < maxLength - 10) {
    return html.substring(0, closeTagStart + 1) + '...';
  }
  
  return html.substring(0, maxLength) + '...';
}

/**
 * Build path-based selector from ancestor path
 * 
 * Strategy:
 * 1. Find the best semantic root (highest score or has stable ID)
 * 2. Build path from root to target, skipping low-value intermediates
 */
export function buildPathSelector(ancestorPath: AncestorInfo[], targetSelector: string): string {
  if (ancestorPath.length === 0) {
    return targetSelector;
  }
  
  // Find semantic root (last item with isSemanticRoot or highest score)
  let rootIndex = ancestorPath.findIndex(a => a.isSemanticRoot);
  if (rootIndex === -1) {
    // Use ancestor with highest semantic score
    let maxScore = 0;
    ancestorPath.forEach((a, i) => {
      if (a.semanticScore > maxScore) {
        maxScore = a.semanticScore;
        rootIndex = i;
      }
    });
  }
  
  if (rootIndex === -1 || ancestorPath[rootIndex].semanticScore < 0.3) {
    // No good root found, just use target selector
    return targetSelector;
  }
  
  // Build path from root to target
  const parts: string[] = [];
  
  // Add root
  parts.push(ancestorPath[rootIndex].selector);
  
  // Add intermediate nodes with decent semantic value
  for (let i = rootIndex - 1; i >= 0; i--) {
    const ancestor = ancestorPath[i];
    // Only include if it adds semantic value
    if (ancestor.semanticScore >= 0.5) {
      parts.push(ancestor.selector);
    }
  }
  
  // Add target
  parts.push(targetSelector);
  
  return parts.join(' ');
}

// Elements that should NOT be used as repeating containers
// These are too granular - we should continue upward to find a more meaningful container
const SKIP_AS_CONTAINER = ['TD', 'TH', 'SPAN', 'A', 'STRONG', 'EM', 'B', 'I'];

// Elements that are ideal repeating containers
const PREFERRED_CONTAINERS = ['TR', 'LI', 'ARTICLE', 'SECTION'];

/**
 * Find the nearest repeating container (e.g., table row, list item)
 * 
 * Design principle:
 * - Skip granular elements like TD/TH (they repeat within a row, but a row is the meaningful unit)
 * - Prefer semantic containers like TR, LI, ARTICLE
 * - For tables: always use TR as the container, not TD
 */
export function findRepeatingContainer(element: HTMLElement): HTMLElement | null {
  let current = element.parentElement;
  let foundCandidate: HTMLElement | null = null;
  
  while (current && current !== document.body) {
    const parent = current.parentElement;
    if (!parent) break;
    
    // Check for similar siblings
    const siblings = Array.from(parent.children).filter(child => {
      if (child.tagName !== current!.tagName) return false;
      // For divs, also check class similarity
      if (child.tagName === 'DIV') {
        const currentClasses = new Set(current!.className.split(/\s+/));
        const childClasses = new Set((child as HTMLElement).className.split(/\s+/));
        // At least 50% class overlap
        const overlap = [...currentClasses].filter(c => childClasses.has(c)).length;
        return overlap >= Math.min(currentClasses.size, childClasses.size) * 0.5;
      }
      return true;
    });
    
    // Found repeating structure
    if (siblings.length >= 2) {
      // If this is a granular element (TD/TH), skip it and continue looking for a better container
      if (SKIP_AS_CONTAINER.includes(current.tagName)) {
        // Remember this as a fallback, but keep looking
        if (!foundCandidate) {
          foundCandidate = current;
        }
        current = parent;
        continue;
      }
      
      // If this is a preferred container, return immediately
      if (PREFERRED_CONTAINERS.includes(current.tagName)) {
        return current;
      }
      
      // For other elements, return this container
      return current;
    }
    
    current = parent;
  }
  
  // Return the fallback candidate if we found one
  return foundCandidate;
}

/**
 * Find the nearest ancestor with semantic class/id (not requiring siblings)
 * 
 * This is different from findRepeatingContainer:
 * - findRepeatingContainer: finds containers with similar siblings (table rows, list items)
 * - findSemanticContainer: finds containers with semantic identifiers (search-bar, form-group)
 * 
 * Use case: <div class="search-bar"><button>Search</button></div>
 * - The button has no semantic attributes
 * - But its parent .search-bar is a stable, semantic container
 * - We use ".search-bar button" instead of just "button"
 */
export function findSemanticContainer(element: HTMLElement): HTMLElement | null {
  let current = element.parentElement;
  
  while (current && current !== document.body) {
    // Check for stable ID (not dynamic/random)
    if (current.id && !current.id.match(/\d{5,}|uid|uuid|random|react|vue|ng-/i)) {
      return current;
    }
    
    // Check for data-testid (designed for automation)
    if (current.getAttribute('data-testid')) {
      return current;
    }
    
    // Check for semantic class names
    const hasSemanticClass = Array.from(current.classList).some(cls =>
      SEMANTIC_CLASS_PATTERNS.some(pattern => pattern.test(cls))
    );
    
    if (hasSemanticClass) {
      return current;
    }
    
    // Check for semantic tag + class combination (like form, nav, header, etc.)
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
  
  // Check parent for grid/flex
  const parent = container.parentElement;
  if (parent) {
    const style = window.getComputedStyle(parent);
    if (style.display === 'grid') return 'grid';
    if (style.display === 'flex') return 'grid';
  }
  
  // Check for card-like structure
  if (container.classList.toString().match(/card|item|row/i)) {
    return 'card';
  }
  
  return 'grid';
}

/**
 * Find anchor candidates within a container
 * 
 * IMPORTANT: Anchors must be able to DISTINGUISH different container instances.
 * For example, in a table with multiple rows, the anchor should be something unique
 * to each row (like student name "Alice Johnson"), not something shared by all rows
 * (like data-testid="audit-row").
 * 
 * Priority:
 * 1. text_match - Text content that varies between instances (best for automation)
 * 2. attribute_match on CHILD elements - Attributes that might vary
 * 
 * Container's own attributes are NOT good anchors because they're the same for all instances.
 */
export function findAnchorCandidates(container: HTMLElement): AnchorCandidate[] {
  const candidates: AnchorCandidate[] = [];
  
  // 1. Find text elements that could be anchors (PRIORITY - these distinguish instances)
  const textElements = container.querySelectorAll('*');
  const textsFound = new Map<string, HTMLElement>();
  
  textElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    // Get direct text content (not from children)
    const directText = getDirectTextContent(htmlEl);
    
    if (directText && directText.length >= 2 && directText.length <= 100) {
      if (!textsFound.has(directText)) {
        textsFound.set(directText, htmlEl);
      }
    }
  });
  
  // Convert to candidates - text matches get high priority
  textsFound.forEach((el, text) => {
    const selector = buildMinimalSelector(el, container);
    const confidence = calculateTextConfidence(el, text);
    
    candidates.push({
      selector,
      type: 'text_match',
      text,
      confidence: confidence + 0.2, // Boost text matches - they distinguish instances
      isUnique: isLikelyUnique(text),
    });
  });
  
  // 2. Check for semantic attributes on CHILD elements (not container itself)
  // These might vary between instances (e.g., data-id="123" vs data-id="456")
  textElements.forEach(el => {
    // Skip the container itself - its attributes are the same for all instances
    if (el === container) return;
    
    for (const attr of SEMANTIC_ATTRIBUTES) {
      const value = el.getAttribute(attr);
      if (value && value.length > 2) {
        const selector = buildMinimalSelector(el as HTMLElement, container);
        candidates.push({
          selector,
          type: 'attribute_match',
          attribute: { name: attr, value },
          confidence: 0.6, // Lower than text matches
          isUnique: false,
        });
      }
    }
  });
  
  // 3. Container's own unique attributes - LOWEST priority
  // These identify the container TYPE but not specific instances
  // Only include as fallback for when no better anchors exist
  for (const attr of UNIQUE_ATTRIBUTES) {
    const value = container.getAttribute(attr);
    if (value) {
      candidates.push({
        selector: `[${attr}]`,
        type: 'attribute_match',
        attribute: { name: attr, value },
        confidence: 0.3, // Low - doesn't distinguish instances
        isUnique: false, // NOT unique per instance!
      });
    }
  }
  
  // Sort by: 1) type (text_match first), 2) uniqueness, 3) confidence
  return candidates
    .sort((a, b) => {
      // Priority 1: text_match over attribute_match
      if (a.type !== b.type) {
        return a.type === 'text_match' ? -1 : 1;
      }
      // Priority 2: unique candidates first
      if (a.isUnique !== b.isUnique) {
        return a.isUnique ? -1 : 1;
      }
      // Priority 3: higher confidence first
      return b.confidence - a.confidence;
    })
    .slice(0, 5); // Top 5 candidates
}

/**
 * Get direct text content of an element (excluding children)
 */
function getDirectTextContent(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  // Remove all child elements
  Array.from(clone.children).forEach(child => child.remove());
  return clone.textContent?.trim() || '';
}

/**
 * Calculate confidence score for a text anchor
 */
function calculateTextConfidence(element: HTMLElement, text: string): number {
  let score = 0.5;
  
  // Semantic elements get higher scores
  if (['H1', 'H2', 'H3', 'A', 'LABEL', 'SPAN'].includes(element.tagName)) {
    score += 0.1;
  }
  
  // Elements with semantic classes
  if (element.className.match(/name|title|label|id|key/i)) {
    score += 0.15;
  }
  
  // First child or prominent position
  if (element.parentElement?.firstElementChild === element) {
    score += 0.1;
  }
  
  // Reasonable text length
  if (text.length >= 3 && text.length <= 50) {
    score += 0.1;
  }
  
  return Math.min(score, 1);
}

/**
 * Check if text is likely a unique identifier
 */
function isLikelyUnique(text: string): boolean {
  // Looks like an ID or code
  if (/^[A-Z0-9\-_]+$/i.test(text)) return true;
  // Has numbers suggesting ID
  if (/\d{3,}/.test(text)) return true;
  // Short name-like text
  if (text.length <= 30 && /^[\u4e00-\u9fa5a-zA-Z\s]+$/.test(text)) return true;
  
  return false;
}

/**
 * Build a minimal CSS selector for an element
 * 
 * Design philosophy:
 * - Use structurally stable selectors (avoid dynamic IDs, text content)
 * - Rely on container + structural position (nth-of-type) for disambiguation
 * - Text matching should be handled by Anchor mechanism, not selectors
 * - Only use standard CSS selectors (no jQuery extensions like :contains)
 */
export function buildMinimalSelector(
  element: HTMLElement, 
  context?: HTMLElement
): string {
  const tag = element.tagName.toLowerCase();
  
  // Priority 1: Stable ID (only if not dynamic/random)
  if (element.id && !element.id.match(/\d{5,}|uid|uuid|random|react|vue/i)) {
    return `#${CSS.escape(element.id)}`;
  }
  
  // Priority 2: data-testid (designed for automation)
  const testId = element.getAttribute('data-testid');
  if (testId) {
    return `[data-testid="${testId}"]`;
  }
  
  // Priority 3: Stable semantic attributes
  const name = element.getAttribute('name');
  if (name && !name.match(/\d{5,}/)) {
    return `${tag}[name="${name}"]`;
  }
  
  // Priority 4: Tag + semantic/stable classes
  const stableClasses = Array.from(element.classList)
    .filter(c => !c.match(/\d{5,}|active|hover|focus|selected|disabled|ng-|vue-|react-/i))
    .slice(0, 2);
  
  if (stableClasses.length > 0) {
    return `${tag}.${stableClasses.join('.')}`;
  }
  
  // Priority 5: Tag + role or type attributes
  const role = element.getAttribute('role');
  if (role) {
    return `${tag}[role="${role}"]`;
  }
  
  const type = element.getAttribute('type');
  if (type && ['button', 'submit', 'text', 'checkbox', 'radio', 'email', 'password'].includes(type)) {
    return `${tag}[type="${type}"]`;
  }
  
  // Priority 6: Structural position within context/parent
  // Use nth-of-type for disambiguation when no semantic attributes exist
  const parent = context || element.parentElement;
  if (parent) {
    const siblings = Array.from(parent.querySelectorAll(`:scope > ${tag}`));
    if (siblings.length > 1) {
      const index = siblings.indexOf(element) + 1;
      if (index > 0) {
        return `${tag}:nth-of-type(${index})`;
      }
    }
  }
  
  // Fallback: just the tag (rely on container context for uniqueness)
  return tag;
}

/**
 * Build a selector relative to a container
 */
export function buildRelativeSelector(
  target: HTMLElement, 
  container: HTMLElement
): string {
  // Walk up from target to container to build path
  const path: string[] = [];
  let current: HTMLElement | null = target;
  
  while (current && current !== container) {
    const selector = buildMinimalSelector(current, container);
    path.unshift(selector);
    current = current.parentElement;
  }
  
  // Simplify path if possible
  if (path.length > 3) {
    // Use direct child selector for last element
    return path.slice(-2).join(' > ');
  }
  
  return path.join(' ');
}

/**
 * Get a simplified HTML representation of an element
 */
export function getElementHtml(element: HTMLElement, maxLength: number = 200): string {
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Remove script/style content
  clone.querySelectorAll('script, style').forEach(el => el.remove());
  
  // Truncate long text
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
  // Get container and one sibling for context
  const parent = container.parentElement;
  if (!parent) {
    return getElementHtml(container, maxLength);
  }
  
  const siblings = Array.from(parent.children).slice(0, 3);
  return siblings.map(el => getElementHtml(el as HTMLElement, maxLength / 3)).join('\n');
}
