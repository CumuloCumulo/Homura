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
  AnchorCandidate 
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
  };
}

/**
 * Find the nearest repeating container (e.g., table row, list item)
 */
export function findRepeatingContainer(element: HTMLElement): HTMLElement | null {
  let current = element.parentElement;
  
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
      return current;
    }
    
    current = parent;
  }
  
  return null;
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
 */
export function findAnchorCandidates(container: HTMLElement): AnchorCandidate[] {
  const candidates: AnchorCandidate[] = [];
  
  // 1. Check for unique attributes on container itself
  for (const attr of UNIQUE_ATTRIBUTES) {
    const value = container.getAttribute(attr);
    if (value) {
      candidates.push({
        selector: `[${attr}]`,
        type: 'attribute_match',
        attribute: { name: attr, value },
        confidence: 0.9,
        isUnique: true,
      });
    }
  }
  
  // 2. Find text elements that could be anchors
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
  
  // Convert to candidates
  textsFound.forEach((el, text) => {
    const selector = buildMinimalSelector(el, container);
    const confidence = calculateTextConfidence(el, text);
    
    candidates.push({
      selector,
      type: 'text_match',
      text,
      confidence,
      isUnique: isLikelyUnique(text),
    });
  });
  
  // 3. Check for semantic attributes on child elements
  textElements.forEach(el => {
    for (const attr of SEMANTIC_ATTRIBUTES) {
      const value = el.getAttribute(attr);
      if (value && value.length > 2) {
        const selector = buildMinimalSelector(el as HTMLElement, container);
        candidates.push({
          selector,
          type: 'attribute_match',
          attribute: { name: attr, value },
          confidence: 0.7,
          isUnique: false,
        });
      }
    }
  });
  
  // Sort by confidence and uniqueness
  return candidates
    .sort((a, b) => {
      if (a.isUnique !== b.isUnique) return a.isUnique ? -1 : 1;
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
