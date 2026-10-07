import { useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { parseAndFilterEmails, normalizeEmail } from '../utils/emailAddressParsing.js';
import { showEditorMessage, EditorMessageKey } from '../../features/editor/messages/editorMessages.js';

export function useEmailChipsInput({
  limit = 20,
  excludedEmails = [],
  collapseLimit = Infinity,
  onChange
} = {}) {
  const [emails, setEmails] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const commit = useCallback((rawValue) => {
    const { validEmails, overflowCount, excludedCount } = parseAndFilterEmails(rawValue, {
      existingEmails: emails,
      limit,
      excludedEmails
    });

    if (validEmails.length > 0) {
      const next = [...emails, ...validEmails];
      setEmails(next);
      onChange?.(next);
    }

    if (overflowCount > 0) {
      showEditorMessage(EditorMessageKey.EMAIL_LIMIT_REACHED, {
        allowedCount: validEmails.length,
        overflowCount,
        limit
      });
    }

    if (excludedCount > 0) {
      showEditorMessage(EditorMessageKey.OWN_EMAIL_SKIPPED);
    }

    return validEmails.length > 0;
  }, [emails, limit, excludedEmails, onChange]);

  const handleInputChange = useCallback((event) => {
    setInputValue(event.target.value);
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (!['Enter', ',', ';', 'Tab'].includes(event.key)) return;
    if (!inputValue.trim()) return;

    const added = commit(inputValue);
    if (added && event.key !== 'Tab') {
      event.preventDefault();
    }
    if (added) setInputValue('');
  }, [inputValue, commit]);

  const handlePaste = useCallback((event) => {
    const pasted = event.clipboardData?.getData('text') || '';
    if (!pasted) return;

    event.preventDefault();
    commit(inputValue ? `${inputValue} ${pasted}` : pasted);
    setInputValue('');
  }, [inputValue, commit]);

  const handleBlur = useCallback(() => {
    if (inputValue.trim()) {
      commit(inputValue);
      setInputValue('');
    }
  }, [inputValue, commit]);

  const removeEmail = useCallback((email) => {
    const normalized = normalizeEmail(email);
    setEmails((prev) => {
      const next = prev.filter((existing) => normalizeEmail(existing) !== normalized);
      onChange?.(next);
      return next;
    });
  }, [onChange]);

  const expand = useCallback(() => setIsExpanded(true), []);

  const hiddenCount = !isExpanded && emails.length > collapseLimit
    ? emails.length - collapseLimit
    : 0;
  const visibleEmails = hiddenCount > 0 ? emails.slice(0, collapseLimit) : emails;

  return {
    emails,
    visibleEmails,
    hiddenCount,
    expand,
    inputValue,
    handleInputChange,
    handleKeyDown,
    handlePaste,
    handleBlur,
    removeEmail
  };
}

export default function EmailChipsInput({
  id,
  limit = 20,
  excludedEmails = [],
  collapseLimit = Infinity,
  onChange,
  placeholder = 'Add recipient email'
}) {
  const {
    visibleEmails,
    hiddenCount,
    expand,
    inputValue,
    handleInputChange,
    handleKeyDown,
    handlePaste,
    handleBlur,
    removeEmail
  } = useEmailChipsInput({ limit, excludedEmails, collapseLimit, onChange });

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 focus-within:border-orange-400">
      {visibleEmails.map((email) => (
        <span
          key={email}
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
        >
          {email}
          <button
            type="button"
            onClick={() => removeEmail(email)}
            aria-label={`Remove ${email}`}
            className="text-gray-400 hover:text-gray-700"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={expand}
          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-200"
        >
          {hiddenCount} more
        </button>
      )}

      <input
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={visibleEmails.length === 0 ? placeholder : ''}
        className="min-w-[120px] flex-1 border-none text-sm text-gray-800 outline-none"
      />
    </div>
  );
}
