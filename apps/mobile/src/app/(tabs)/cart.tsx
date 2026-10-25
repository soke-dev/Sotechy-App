import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { formatNaira } from "@sotechy/shared";
import { Button, Card, Empty, styles } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { colors } from "@/lib/theme";

export default function CartScreen() {
  const cart = useCart();
  const { user } = useAuth();

  if (cart.lines.length === 0) {
    return (
      <Empty title="Your cart is empty">
        <Button title="Start shopping" onPress={() => router.push("/shop")} />
      </Empty>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {cart.lines.map((line) => (
        <Card key={line.variantId}>
          <Text style={{ fontWeight: "600" }}>{line.productName}</Text>
          <Text style={styles.muted}>{line.variantName}</Text>
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <Text style={styles.price}>{formatNaira(line.unitPrice * line.quantity)}</Text>
            <View style={styles.row}>
              <Button title="−" variant="secondary" onPress={() => cart.setQuantity(line.variantId, line.quantity - 1)} />
              <Text style={{ minWidth: 24, textAlign: "center" }}>{line.quantity}</Text>
              <Button title="+" variant="secondary" onPress={() => cart.setQuantity(line.variantId, line.quantity + 1)} />
            </View>
          </View>
          <Pressable onPress={() => cart.remove(line.variantId)}>
            <Text style={{ color: colors.danger }}>Remove</Text>
          </Pressable>
        </Card>
      ))}
      <Card>
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <Text>Subtotal (estimate)</Text>
          <Text style={styles.price}>{formatNaira(cart.subtotal)}</Text>
        </View>
        <Text style={[styles.muted, { fontSize: 12 }]}>Delivery fees and discounts are calculated at checkout.</Text>
      </Card>
      <Button title={user ? "Checkout" : "Sign in to checkout"} onPress={() => router.push(user ? "/checkout" : "/sign-in")} />
    </ScrollView>
  );
}
