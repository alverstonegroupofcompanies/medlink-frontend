import { Stack } from 'expo-router';

export default function JobDetailLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="[applicationId]" />
    </Stack>
  );
}


