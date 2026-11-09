import { ComponentRef, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform, View } from 'react-native';

/**
 * Bottom padding that keeps a container's bottom edge above the keyboard.
 *
 * KeyboardAvoidingView measures itself relative to its parent, so when it
 * sits below headers (as the chat thread does) it under-pads and the
 * composer ends up behind the keyboard. This measures the container in
 * window coordinates instead, which also works when the window itself
 * resizes (the overlap is then simply 0).
 */
export const useKeyboardInset = () => {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [inset, setInset] = useState<number>(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      const keyboardTop = e.endCoordinates.screenY;
      ref.current?.measureInWindow((_x, y, _w, height) => {
        // The container's own padding doesn't change its frame, so this is stable.
        const next = Math.max(0, Math.round(y + height - keyboardTop));
        setInset((prev) => (prev === next ? prev : next));
      });
    };

    const subs = [
      Keyboard.addListener(showEvent, onShow),
      Keyboard.addListener(hideEvent, () => setInset(0)),
    ];
    if (Platform.OS === 'ios') subs.push(Keyboard.addListener('keyboardWillChangeFrame', onShow));
    return () => subs.forEach((s) => s.remove());
  }, []);

  return { ref, inset };
};
