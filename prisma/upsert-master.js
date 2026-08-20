const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = process.env.AUTH_SALT || "kamael_finance_salt_2026";
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

async function main() {
  const email = "kamaelcontatos@gmail.com";
  const password = "Kama@159";
  const hashedPassword = hashPassword(password);

  console.log(`Upserting user: ${email}...`);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  let user;
  if (existingUser) {
    user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        password: hashedPassword,
        role: "MASTER",
        status: "ATIVO",
      },
    });
    console.log("Usuário existente atualizado com sucesso para MASTER com a nova senha.");
  } else {
    user = await prisma.user.create({
      data: {
        email,
        name: "Túlio Cavalcanti",
        password: hashedPassword,
        role: "MASTER",
        status: "ATIVO",
      },
    });
    console.log("Novo usuário MASTER criado com sucesso.");
  }

  // Verifica se o usuário já possui carteira, senão cria "Conta Principal"
  const wallets = await prisma.wallet.findMany({
    where: { userId: user.id },
  });

  if (wallets.length === 0) {
    await prisma.wallet.create({
      data: {
        userId: user.id,
        title: "Conta Principal",
        walletType: "CONTA_CORRENTE",
        initialBalance: 0,
      },
    });
    console.log("Carteira 'Conta Principal' criada para o usuário.");
  }

  console.log("------------------------------------------");
  console.log("Credenciais cadastradas com sucesso:");
  console.log(`E-mail: ${user.email}`);
  console.log(`Função: ${user.role}`);
  console.log(`Status: ${user.status}`);
  console.log("------------------------------------------");
}

main()
  .catch((e) => {
    console.error("Erro ao cadastrar usuário:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
