import { sql, type SQL } from "drizzle-orm";
import { db } from "../db/client";

// Statuses that count as revenue (money received and order not reversed)
const REVENUE = sql.raw("('paid','processing','ready_for_pickup','dispatched','delivered')");

async function rows<T>(query: SQL) {
  const result = await db.execute(query);
  return result.rows as T[];
}

/**
 * Sales summary for a period. Revenue, cost of goods and gross profit are reported separately;
 * gross profit is null when any sold item has no recorded cost.
 */
export async function salesSummary(from: Date, to: Date) {
  const range = sql`o.created_at >= ${from} and o.created_at < ${to}`;

  const [totals] = await rows<{ orders: number; revenue: number; aov: number }>(sql`
    select count(*)::int as orders, coalesce(sum(o.total), 0)::float as revenue, coalesce(avg(o.total), 0)::float as aov
    from orders o where o.status in ${REVENUE} and ${range}`);

  const [costs] = await rows<{ product_revenue: number; cogs: number; items_missing_cost: number }>(sql`
    select coalesce(sum(i.line_total), 0)::float as product_revenue,
           coalesce(sum(i.unit_cost * i.quantity), 0)::float as cogs,
           count(*) filter (where i.unit_cost is null)::int as items_missing_cost
    from order_items i join orders o on o.id = i.order_id
    where o.status in ${REVENUE} and ${range}`);

  const byChannel = await rows<{ channel: string; orders: number; revenue: number }>(sql`
    select o.channel, count(*)::int as orders, sum(o.total)::float as revenue
    from orders o where o.status in ${REVENUE} and ${range} group by o.channel`);

  const byBranch = await rows<{ branch: string; orders: number; revenue: number }>(sql`
    select coalesce(b.name, 'Unassigned') as branch, count(*)::int as orders, sum(o.total)::float as revenue
    from orders o left join branches b on b.id = o.branch_id
    where o.status in ${REVENUE} and ${range} group by b.name order by revenue desc`);

  const byPaymentMethod = await rows<{ method: string; orders: number; revenue: number }>(sql`
    select o.payment_method as method, count(*)::int as orders, sum(o.total)::float as revenue
    from orders o where o.status in ${REVENUE} and ${range} group by o.payment_method`);

  const bestSellers = await rows<{ product_name: string; quantity: number; revenue: number }>(sql`
    select i.product_name, sum(i.quantity)::int as quantity, sum(i.line_total)::float as revenue
    from order_items i join orders o on o.id = i.order_id
    where o.status in ${REVENUE} and ${range}
    group by i.product_name order by quantity desc limit 10`);

  const [pending] = await rows<{ count: number; value: number }>(sql`
    select count(*)::int as count, coalesce(sum(o.total), 0)::float as value
    from orders o where o.status = 'pending_payment' and ${range}`);

  const [refunds] = await rows<{ count: number; value: number }>(sql`
    select count(*)::int as count, coalesce(sum(r.amount), 0)::float as value
    from refunds r where r.status = 'processed' and r.created_at >= ${from} and r.created_at < ${to}`);

  const [cancelled] = await rows<{ count: number }>(sql`
    select count(*)::int as count from orders o where o.status = 'cancelled' and ${range}`);

  const [repeat] = await rows<{ count: number }>(sql`
    select count(*)::int as count from (
      select o.customer_id from orders o
      where o.status in ${REVENUE} and o.customer_id is not null and ${range}
      group by o.customer_id having count(*) > 1) t`);

  const [lowStock] = await rows<{ count: number }>(sql`
    select count(*)::int as count from inventory i
    join product_variants v on v.id = i.variant_id join products p on p.id = v.product_id
    where i.quantity - i.reserved <= p.low_stock_threshold`);

  const [stockValue] = await rows<{ at_cost: number | null; at_price: number }>(sql`
    select sum(i.quantity * v.cost_price)::float as at_cost, coalesce(sum(i.quantity * v.price), 0)::float as at_price
    from inventory i join product_variants v on v.id = i.variant_id`);

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
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
