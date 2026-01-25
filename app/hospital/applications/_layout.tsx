import { Stack } from 'expo-router';

export default function ApplicationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="[requirementId]" />
      <Stack.Screen name="compare" />
    </Stack>
  );
}


