import { router, type Href } from "expo-router";
import { Pressable, ScrollView, Text } from "react-native";
import { BUSINESS } from "@sotechy/shared";
import { Button, Card, styles } from "@/components/ui";
import { useAuth } from "@/lib/auth";

function Row({ label, href }: { label: string; href: Href }) {
  return (
    <Pressable onPress={() => router.push(href)} style={{ paddingVertical: 10 }}>
      <Text style={{ fontSize: 15 }}>{label} ›</Text>
    </Pressable>
  );
}

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        {user ? (
          <>
            <Text style={{ fontWeight: "700", fontSize: 16 }}>{user.fullName ?? user.email}</Text>
            <Text style={styles.muted}>{user.email}</Text>
          </>
        ) : (
          <>
            <Text style={{ fontWeight: "600" }}>Browse as a guest. Sign in when you&apos;re ready to order.</Text>
            <Button title="Sign in or create account" onPress={() => router.push("/sign-in")} />
          </>
        )}
      </Card>
      <Card>
        <Row label="My orders" href="/orders" />
        <Row label="Wishlist" href="/wishlist" />
        <Row label="Help & support" href="/support" />
      </Card>
      <Card>
        <Text style={{ fontWeight: "600" }}>{BUSINESS.name}</Text>
        <Text style={styles.muted}>{BUSINESS.tagline}</Text>
        <Text style={styles.muted}>{BUSINESS.headOffice}</Text>
        <Text style={styles.muted}>{BUSINESS.website}</Text>
      </Card>
      {user && <Button title="Sign out" variant="secondary" onPress={signOut} />}
    </ScrollView>
  );
}
