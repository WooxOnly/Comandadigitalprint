import { Keyboard, Pressable as NativePressable, TextInput as NativeTextInput } from 'react-native';
import type { PressableProps, TextInputProps } from 'react-native';

export function KeyboardPressable({ onPress, ...props }: PressableProps) {
  return <NativePressable {...props} onPress={(event) => { Keyboard.dismiss(); onPress?.(event); }} />;
}

export function KeyboardTextInput(props: TextInputProps) {
  return <NativeTextInput returnKeyType="done" submitBehavior="blurAndSubmit" disableFullscreenUI {...props} />;
}
