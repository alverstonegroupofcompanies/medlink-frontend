import { Stack } from 'expo-router';

export default function DoctorProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="[doctorId]" />
    </Stack>
  );
}


