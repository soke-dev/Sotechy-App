import { sql, type SQL } from "drizzle-orm";
import { db } from "../db/client";

// Statuses that count as revenue (money received and order not reversed)
const REVENUE = sql.raw("('paid','processing','ready_for_pickup','dispatched','delivered')");

async function rows<T>(query: SQL) {
  const result = await db.execute(query);
  return result.rows as T[];
}

/**
 * Sales summary for a period. Revenue, cost of goods and gross profit are Sotechy's own shop only;
 * gross profit is null when any sold item has no recorded cost. Stores' sales, Sotechy's fees on them,
 * payouts, tokens and people have their own sections.
 */
export async function salesSummary(from: Date, to: Date) {
  const range = sql`o.created_at >= ${from} and o.created_at < ${to}`;

  const [totals] = await rows<{ orders: number; revenue: number; aov: number }>(sql`
    select count(*)::int as orders, coalesce(sum(o.total), 0)::float as revenue, coalesce(avg(o.total), 0)::float as aov
    from orders o where o.status in ${REVENUE} and o.merchant_id is null and ${range}`);

  const [costs] = await rows<{ product_revenue: number; cogs: number; items_missing_cost: number }>(sql`
    select coalesce(sum(i.line_total), 0)::float as product_revenue,
           coalesce(sum(i.unit_cost * i.quantity), 0)::float as cogs,
           count(*) filter (where i.unit_cost is null)::int as items_missing_cost
    from order_items i join orders o on o.id = i.order_id
    where o.status in ${REVENUE} and o.merchant_id is null and ${range}`);

  const byChannel = await rows<{ channel: string; orders: number; revenue: number }>(sql`
    select o.channel, count(*)::int as orders, sum(o.total)::float as revenue
    from orders o where o.status in ${REVENUE} and o.merchant_id is null and ${range} group by o.channel`);

  const byBranch = await rows<{ branch: string; orders: number; revenue: number }>(sql`
    select coalesce(b.name, 'Unassigned') as branch, count(*)::int as orders, sum(o.total)::float as revenue
    from orders o left join branches b on b.id = o.branch_id
    where o.status in ${REVENUE} and o.merchant_id is null and ${range} group by b.name order by revenue desc`);

  const byPaymentMethod = await rows<{ method: string; orders: number; revenue: number }>(sql`
    select o.payment_method as method, count(*)::int as orders, sum(o.total)::float as revenue
    from orders o where o.status in ${REVENUE} and o.merchant_id is null and ${range} group by o.payment_method`);

  const bestSellers = await rows<{ product_name: string; quantity: number; revenue: number }>(sql`
    select i.product_name, sum(i.quantity)::int as quantity, sum(i.line_total)::float as revenue
    from order_items i join orders o on o.id = i.order_id
    where o.status in ${REVENUE} and o.merchant_id is null and ${range}
    group by i.product_name order by quantity desc limit 10`);

  const [pending] = await rows<{ count: number; value: number }>(sql`
    select count(*)::int as count, coalesce(sum(o.total), 0)::float as value
    from orders o where o.status = 'pending_payment' and o.merchant_id is null and ${range}`);

  const [refunds] = await rows<{ count: number; value: number }>(sql`
    select count(*)::int as count, coalesce(sum(r.amount), 0)::float as value
    from refunds r where r.status = 'processed' and r.created_at >= ${from} and r.created_at < ${to}`);

  const [cancelled] = await rows<{ count: number }>(sql`
    select count(*)::int as count from orders o where o.status = 'cancelled' and o.merchant_id is null and ${range}`);

  const [repeat] = await rows<{ count: number }>(sql`
    select count(*)::int as count from (
      select o.customer_id from orders o
      where o.status in ${REVENUE} and o.customer_id is not null and ${range}
      group by o.customer_id having count(*) > 1) t`);

  const [lowStock] = await rows<{ count: number }>(sql`
    select count(*)::int as count from inventory i
    join product_variants v on v.id = i.variant_id join products p on p.id = v.product_id
    where p.merchant_id is null and i.quantity - i.reserved <= p.low_stock_threshold`);

  const [stockValue] = await rows<{ at_cost: number | null; at_price: number }>(sql`
    select sum(i.quantity * v.cost_price)::float as at_cost, coalesce(sum(i.quantity * v.price), 0)::float as at_price
    from inventory i join product_variants v on v.id = i.variant_id join products p on p.id = v.product_id
    where p.merchant_id is null`);

  const at = (col: string) => sql.raw(col);
  const inRange = (col: string) => sql`${at(col)} >= ${from} and ${at(col)} < ${to}`;

  // --- The marketplace: what stores sold, what Sotechy earned on it, and what went out to stores
  const [market] = await rows<{ orders: number; goods: number; delivery: number }>(sql`
    select count(*)::int as orders, coalesce(sum(o.subtotal - o.discount_total), 0)::float as goods, coalesce(sum(o.delivery_fee), 0)::float as delivery
    from orders o where o.status in ${REVENUE} and o.merchant_id is not null and ${range}`);
  const [payouts] = await rows<{ fees: number; paid: number; paid_count: number }>(sql`
    select coalesce(sum(p.fee) filter (where p.status <> 'cancelled' and ${inRange("p.due_at")}), 0)::float as fees,
           coalesce(sum(p.amount) filter (where p.status = 'paid' and ${inRange("p.paid_at")}), 0)::float as paid,
           count(*) filter (where p.status = 'paid' and ${inRange("p.paid_at")})::int as paid_count
    from merchant_payouts p where p.stage <> 'payback'`);
  const [owed] = await rows<{ value: number; count: number }>(sql`
    select coalesce(sum(p.amount), 0)::float as value, count(*)::int as count
    from merchant_payouts p where p.status in ('scheduled', 'held', 'sending', 'failed') and p.stage <> 'payback'`);
  const [walkIns] = await rows<{ count: number; sales: number; fees: number }>(sql`
    select count(*)::int as count, coalesce(sum(w.amount), 0)::float as sales, coalesce(sum(w.fee), 0)::float as fees
    from walk_in_sales w where w.status = 'paid' and ${inRange("w.paid_at")}`);
  const topStores = await rows<{ store: string; slug: string; orders: number; goods: number }>(sql`
    select m.name as store, m.slug, count(*)::int as orders, sum(o.subtotal - o.discount_total)::float as goods
    from orders o join merchants m on m.id = o.merchant_id
    where o.status in ${REVENUE} and ${range}
    group by m.name, m.slug order by goods desc limit 10`);
  const [stores] = await rows<{ live: number; new_in_range: number; waiting: number }>(sql`
    select count(*) filter (where m.status = 'approved')::int as live,
           count(*) filter (where ${inRange("m.created_at")})::int as new_in_range,
           count(*) filter (where m.status = 'pending' and m.submitted_at is not null)::int as waiting
    from merchants m`);

  // --- Tokens
  const [tokens] = await rows<{ earned: number; spent: number; spent_value: number }>(sql`
    select coalesce(sum(e.amount) filter (where e.kind = 'mint' and e.reason in ('earned', 'bonus', 'review', 'walk_in') and ${inRange("e.created_at")}), 0)::float as earned,
           coalesce(sum(case when e.reason = 'spent' then e.amount when e.reason = 'returned' then -e.amount else 0 end) filter (where ${inRange("e.created_at")}), 0)::float as spent,
           (select coalesce(sum(o.tokens_value), 0)::float from orders o where o.status in ${REVENUE} and ${range}) as spent_value
    from token_entries e`);

  // --- People
  const [people] = await rows<{ new_customers: number; customers: number; buyers: number }>(sql`
    select count(*) filter (where u.role = 'customer' and ${inRange("u.created_at")})::int as new_customers,
           count(*) filter (where u.role = 'customer')::int as customers,
           (select count(distinct o.customer_id)::int from orders o where o.status in ${REVENUE} and ${range}) as buyers
    from users u`);

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    marketplace: {
      orders: market.orders,
      storeSales: market.goods,
      delivery: market.delivery,
      sotechyFees: payouts.fees,
      walkIns: { count: walkIns.count, sales: walkIns.sales, fees: walkIns.fees },
      paidToStores: payouts.paid,
      payoutsPaid: payouts.paid_count,
      owedToStores: owed.value,
      payoutsOwed: owed.count,
      topStores,
      stores: { live: stores.live, new: stores.new_in_range, waiting: stores.waiting },
    },
    tokens: { earned: tokens.earned, spent: tokens.spent, spentValue: tokens.spent_value },
    people: { newCustomers: people.new_customers, customers: people.customers, buyers: people.buyers },
    orders: totals.orders,
    revenue: totals.revenue,
    averageOrderValue: totals.aov,
    productRevenue: costs.product_revenue,
    costOfGoods: costs.cogs,
    itemsMissingCost: costs.items_missing_cost,
    grossProfit: costs.items_missing_cost === 0 ? costs.product_revenue - costs.cogs : null,
    byChannel,
    byBranch,
    byPaymentMethod,
    bestSellers,
    pendingPayments: pending,
    refunds,
    cancelledOrders: cancelled.count,
    repeatCustomers: repeat.count,
    lowStockItems: lowStock.count,
    inventoryValue: { atCost: stockValue.at_cost, atPrice: stockValue.at_price },
  };
}
