import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/** Android hardware back runs `onBack` while the calling screen is mounted. */
export const useHardwareBack = (onBack: () => void) => {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);
};
