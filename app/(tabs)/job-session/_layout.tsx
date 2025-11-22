import { Stack } from 'expo-router';

export default function JobSessionLayout() {
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


