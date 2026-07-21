import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Maps language codes to the Unicode script block they use.
 * Languages not listed here use Latin script (en, fr, es, de, pt, it, nl, …).
 */
const SCRIPT_MAP: Record<string, { name: string; pattern: RegExp }> = {
  ar: { name: 'Arabic',     pattern: /[؀-ۿ]/ },
  fa: { name: 'Persian',    pattern: /[؀-ۿ]/ },
  ur: { name: 'Urdu',       pattern: /[؀-ۿ]/ },
  he: { name: 'Hebrew',     pattern: /[֐-׿]/ },
  zh: { name: 'Chinese',    pattern: /[一-鿿㐀-䶿]/ },
  ja: { name: 'Japanese',   pattern: /[぀-ゟ゠-ヿ一-鿿]/ },
  ko: { name: 'Korean',     pattern: /[가-힯]/ },
  ru: { name: 'Russian',    pattern: /[Ѐ-ӿ]/ },
  uk: { name: 'Ukrainian',  pattern: /[Ѐ-ӿ]/ },
  bg: { name: 'Bulgarian',  pattern: /[Ѐ-ӿ]/ },
  th: { name: 'Thai',       pattern: /[฀-๿]/ },
  hi: { name: 'Hindi',      pattern: /[ऀ-ॿ]/ },
  bn: { name: 'Bengali',    pattern: /[ঀ-৿]/ },
  el: { name: 'Greek',      pattern: /[Ͱ-Ͽ]/ },
};

/**
 * Regex that matches any character from one of the unique non-Latin scripts above.
 * Used to detect non-Latin text in a field that should be in a Latin language.
 */
const ANY_NON_LATIN =
  /[؀-ۿ֐-׿一-鿿㐀-䶿぀-ヿ가-힯Ѐ-ӿ฀-๿ऀ-ॿঀ-৿Ͱ-Ͽ]/;

/**
 * Returns a human-readable error message if the text is written in the wrong
 * script for the given language code, or null if the text is acceptable.
 *
 * Skips validation when the text is fewer than 2 printable characters so
 * partial input doesn't flash an error immediately.
 */
export function checkLanguageScript(text: string, langCode: string): string | null {
  const trimmed = (text ?? '').trim();
  if (trimmed.length < 2) return null;

  const scriptInfo = SCRIPT_MAP[langCode];

  if (scriptInfo) {
    // ponytail: non-Latin language — text must contain at least one script-specific char
    if (!scriptInfo.pattern.test(trimmed)) {
      const detected = detectScriptName(trimmed);
      if (detected) {
        return `Text appears to be in ${detected}. Please enter it in ${scriptInfo.name}.`;
      }
      return `Please enter the text in ${scriptInfo.name} for the selected language.`;
    }
    return null;
  }

  // ponytail: Latin-based language — text must not contain characters from unique scripts
  const detectedNonLatin = detectScriptName(trimmed);
  if (detectedNonLatin) {
    return `Text appears to be in ${detectedNonLatin}. Please enter it in the selected language (Latin script).`;
  }

  return null;
}

/** Returns the script name of the first non-Latin block found, or null. */
function detectScriptName(text: string): string | null {
  for (const info of Object.values(SCRIPT_MAP)) {
    if (info.pattern.test(text)) return info.name;
  }
  // Fallback: check the broad non-Latin range even if we don't have a named mapping
  if (ANY_NON_LATIN.test(text)) return 'an unsupported script';
  return null;
}

/**
 * Angular ValidatorFn factory.
 *
 * Pass a getter that returns the current language code so the validator
 * always reads the latest value even after language changes.
 *
 * Usage:
 *   control.addValidators(languageScriptValidator(() => this.selectedLanguage()?.code ?? 'en'));
 *   control.updateValueAndValidity();
 */
export function languageScriptValidator(getLangCode: () => string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const message = checkLanguageScript(control.value ?? '', getLangCode());
    return message ? { wrongScript: { message } } : null;
  };
}
