import { useEffect, useState } from 'react';
import { organizationsApi } from '../api/client.js';

const NAME_RE = /^[a-zA-Z0-9]+$/;

/** Live length/character/availability validation for a workspace name, as the
 *  user types — mirrors the backend's `checkNameAvailability` rules so an
 *  invalid or taken name is flagged immediately instead of only on submit. */
export function useWorkspaceNameCheck(name) {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null); // true | false | null (unknown/empty)

  const trimmed = name.trim();
  let error = '';
  if (trimmed.length > 0 && trimmed.length < 5) error = 'Must be at least 5 characters';
  else if (trimmed.length > 15) error = 'Must be at most 15 characters';
  else if (trimmed.length > 0 && !NAME_RE.test(trimmed)) error = 'Only letters and numbers are allowed';

  useEffect(() => {
    if (error || trimmed.length === 0) {
      setAvailable(null);
      return undefined;
    }
    setChecking(true);
    const t = setTimeout(() => {
      organizationsApi
        .checkName(trimmed)
        .then((r) => setAvailable(r.available))
        .catch(() => setAvailable(null))
        .finally(() => setChecking(false));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, error]);

  const takenError = !error && available === false ? 'This name is already taken' : '';
  return { error: error || takenError, checking, available: !error && available === true };
}
