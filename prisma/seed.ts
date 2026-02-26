import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create users
  const adminPassword = await bcrypt.hash("admin123", 12);
  const gerentePassword = await bcrypt.hash("gerente123", 12);
  const funcPassword = await bcrypt.hash("func123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@stockpro.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@stockpro.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  const gerente = await prisma.user.upsert({
    where: { email: "gerente@stockpro.com" },
    update: {},
    create: {
      name: "Gerente Silva",
      email: "gerente@stockpro.com",
      password: gerentePassword,
      role: "GERENTE",
    },
  });

  const funcionario = await prisma.user.upsert({
    where: { email: "funcionario@stockpro.com" },
    update: {},
    create: {
      name: "João Funcionário",
      email: "funcionario@stockpro.com",
      password: funcPassword,
      role: "FUNCIONARIO",
    },
  });

  console.log("Users created:", { admin: admin.email, gerente: gerente.email, funcionario: funcionario.email });

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: { name: "Arroz 5kg", category: "Alimentos", buyPrice: 15.0, sellPrice: 22.0, quantity: 100, minQuantity: 20 },
    }),
    prisma.product.create({
      data: { name: "Feijão 1kg", category: "Alimentos", buyPrice: 8.0, sellPrice: 12.0, quantity: 80, minQuantity: 15 },
    }),
    prisma.product.create({
      data: { name: "Óleo de Soja 900ml", category: "Alimentos", buyPrice: 6.5, sellPrice: 9.5, quantity: 50, minQuantity: 10 },
    }),
    prisma.product.create({
      data: { name: "Açúcar 1kg", category: "Alimentos", buyPrice: 4.0, sellPrice: 6.5, quantity: 60, minQuantity: 15 },
    }),
    prisma.product.create({
      data: { name: "Farinha de Trigo 1kg", category: "Alimentos", buyPrice: 3.5, sellPrice: 5.5, quantity: 45, minQuantity: 10 },
    }),
    prisma.product.create({
      data: { name: "Detergente 500ml", category: "Limpeza", buyPrice: 2.0, sellPrice: 3.5, quantity: 3, minQuantity: 10 },
    }),
    prisma.product.create({
      data: { name: "Sabão em Pó 1kg", category: "Limpeza", buyPrice: 8.0, sellPrice: 12.0, quantity: 30, minQuantity: 8 },
    }),
    prisma.product.create({
      data: { name: "Água Sanitária 1L", category: "Limpeza", buyPrice: 3.0, sellPrice: 5.0, quantity: 5, minQuantity: 10 },
    }),
    prisma.product.create({
      data: { name: "Refrigerante 2L", category: "Bebidas", buyPrice: 5.0, sellPrice: 8.0, quantity: 40, minQuantity: 12 },
    }),
    prisma.product.create({
      data: { name: "Água Mineral 500ml", category: "Bebidas", buyPrice: 1.0, sellPrice: 2.5, quantity: 200, minQuantity: 50 },
    }),
  ]);

  console.log(`${products.length} products created`);

  // Create some purchases
  const purchase = await prisma.purchase.create({
    data: {
      userId: gerente.id,
      total: 750.0,
      notes: "Compra semanal de alimentos",
      items: {
        create: [
          { productId: products[0].id, quantity: 20, unitPrice: 15.0, total: 300.0 },
          { productId: products[1].id, quantity: 30, unitPrice: 8.0, total: 240.0 },
          { productId: products[2].id, quantity: 20, unitPrice: 6.5, total: 130.0 },
          { productId: products[3].id, quantity: 20, unitPrice: 4.0, total: 80.0 },
        ],
      },
    },
  });
  console.log("Purchase created:", purchase.id);

  // Create some sales
  const sale = await prisma.sale.create({
    data: {
      userId: funcionario.id,
      total: 97.0,
      profit: 32.5,
      notes: "Venda da manhã",
      items: {
        create: [
          { productId: products[0].id, quantity: 2, unitPrice: 22.0, buyPrice: 15.0, total: 44.0, profit: 14.0 },
          { productId: products[1].id, quantity: 3, unitPrice: 12.0, buyPrice: 8.0, total: 36.0, profit: 12.0 },
          { productId: products[3].id, quantity: 1, unitPrice: 6.5, buyPrice: 4.0, total: 6.5, profit: 2.5 },
          { productId: products[8].id, quantity: 2, unitPrice: 8.0, buyPrice: 5.0, total: 16.0, profit: 6.0 },
        ],
      },
    },
  });
  console.log("Sale created:", sale.id);

  // Create orders
  const order1 = await prisma.order.create({
    data: {
      userId: funcionario.id,
      status: "PENDENTE",
      total: 220.0,
      notes: "Encomenda para cliente João",
      items: {
        create: [
          { productId: products[0].id, quantity: 10, unitPrice: 22.0, total: 220.0 },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      userId: gerente.id,
      status: "EM_ANDAMENTO",
      total: 150.0,
      notes: "Encomenda urgente",
      items: {
        create: [
          { productId: products[6].id, quantity: 5, unitPrice: 12.0, total: 60.0 },
          { productId: products[8].id, quantity: 10, unitPrice: 8.0, total: 80.0 },
          { productId: products[9].id, quantity: 4, unitPrice: 2.5, total: 10.0 },
        ],
      },
    },
  });
  console.log("Orders created:", order1.id, order2.id);

  // Create debts
  const debt1 = await prisma.debt.create({
    data: {
      clientName: "Maria Santos",
      totalAmount: 500.0,
      paidAmount: 200.0,
      remaining: 300.0,
      description: "Compras do mês de janeiro",
      payments: {
        create: [
          { amount: 100.0, notes: "Primeiro pagamento" },
          { amount: 100.0, notes: "Segundo pagamento" },
        ],
      },
    },
  });

  const debt2 = await prisma.debt.create({
    data: {
      clientName: "Pedro Oliveira",
      totalAmount: 250.0,
      paidAmount: 0,
      remaining: 250.0,
      description: "Material de construção",
    },
  });
  console.log("Debts created:", debt1.id, debt2.id);

  // Create notes
  await prisma.note.create({
    data: {
      userId: gerente.id,
      title: "Reunião com fornecedor",
      content: "Agendar reunião com fornecedor de alimentos para próxima semana. Negociar novos preços.",
    },
  });

  await prisma.note.create({
    data: {
      userId: funcionario.id,
      orderId: order1.id,
      title: "Acompanhamento da encomenda",
      content: "Cliente pediu para entregar até sexta-feira. Verificar disponibilidade.",
    },
  });

  console.log("Notes created");
  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
