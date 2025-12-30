import { Stack } from 'expo-router';

export default function ReviewSessionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="[sessionId]" />
    </Stack>
  );
}
