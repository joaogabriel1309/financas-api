// Executar: pnpm exec tsx test/contas-mensais.integration.ts
// Cria e remove apenas um banco temporário. Nunca insere dados no banco da API.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import dotenv from 'dotenv';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { ContasService } from '../src/contas/contas.service';

dotenv.config({ quiet: true });

async function main() {
  const originalUrl = process.env.DATABASE_URL;
  assert.ok(originalUrl, 'DATABASE_URL precisa estar configurada');
  const nomeBanco = `financas_monthly_test_${Date.now()}`;
  const admin = new Client({ connectionString: originalUrl });
  let db: Client | undefined;
  let prisma: PrismaService | undefined;
  let criado = false;
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE "${nomeBanco}"`);
    criado = true;
    const testUrl = new URL(originalUrl);
    testUrl.pathname = `/${nomeBanco}`;
    process.env.DATABASE_URL = testUrl.toString();
    db = new Client({ connectionString: testUrl.toString() });
    await db.connect();
    const pasta = join(process.cwd(), 'prisma', 'migrations');
    const nova = '20261007150000_contas_por_mes';
    for (const migration of readdirSync(pasta)
      .filter((nome) => /^\d/.test(nome) && nome < nova)
      .sort()) {
      await db.query(
        readFileSync(join(pasta, migration, 'migration.sql'), 'utf8'),
      );
    }
    const {
      rows: [usuario],
    } = await db.query<{ id: number }>(
      `INSERT INTO usuarios (nome, login, senha, updated_at) VALUES ('Teste mensal', 'teste-mensal', 'nao-utilizada', NOW()) RETURNING id`,
    );
    const legadoId = randomUUID();
    await db.query(
      `INSERT INTO contas (id, nome, valor, usuario_id, recorrencia, pago, created_at, updated_at, data_hora_pagamento)
      VALUES ($1, 'Legado', 100, $2, true, true, '2026-11-01 02:00:00', NOW(), '2026-11-02 12:00:00')`,
      [legadoId, usuario.id],
    );
    await db.query(readFileSync(join(pasta, nova, 'migration.sql'), 'utf8'));
    prisma = new PrismaService();
    await prisma.onModuleInit();
    const service = new ContasService(prisma);
    const uid = usuario.id;
    const forma = await prisma.formaPagamento.create({
      data: { nome: 'Pix', usuarioId: uid },
    });
    const outroUsuario = await prisma.usuario.create({
      data: {
        nome: 'Outro usuário',
        login: 'outro-usuario',
        senha: 'nao-utilizada',
      },
    });
    const formaAlheia = await prisma.formaPagamento.create({
      data: { nome: 'Cartão', usuarioId: outroUsuario.id },
    });
    const outraForma = await prisma.formaPagamento.create({
      data: { nome: 'Cartão pessoal', usuarioId: uid },
    });
    const outubro = await service.listar(uid, '2026-10');
    assert.equal(outubro.length, 1);
    assert.equal(outubro[0].id, legadoId);
    assert.equal(outubro[0].pago, true);
    assert.equal(outubro[0].formaPagamentoId, null);
    assert.equal(outubro[0].formaPagamento, null);
    assert.equal(
      outubro[0].dataHoraPagamento?.toISOString(),
      '2026-11-02T12:00:00.000Z',
    );
    assert.equal((await service.listar(uid, '2026-11'))[0].pago, false);
    assert.deepEqual(await service.listar(uid, '2026-09'), []);

    const recorrente = await service.criar(uid, {
      nome: 'Internet',
      valor: 99.9,
      recorrencia: true,
      mes: '2026-10',
      formaPagamentoId: forma.id,
    });
    const unica = await service.criar(uid, {
      nome: 'Manutenção',
      valor: 50,
      mes: '2026-11',
      formaPagamentoId: null,
    });
    const parcelada = await service.criar(uid, {
      nome: 'Compra',
      valor: 75.5,
      parcela: 3,
      mes: '2026-12',
      formaPagamentoId: forma.id,
    });
    assert.deepEqual(recorrente.formaPagamento, { id: forma.id, nome: 'Pix' });
    assert.equal(recorrente.formaPagamentoId, forma.id);
    assert.equal(unica.formaPagamento, null);
    assert.equal(unica.formaPagamentoId, null);
    const quantidadeAntes = await prisma.conta.count();
    for (const formaPagamentoId of [formaAlheia.id, randomUUID()]) {
      await assert.rejects(
        service.criar(uid, { nome: 'Vínculo inválido', formaPagamentoId }),
        NotFoundException,
      );
    }
    assert.equal(
      await prisma.conta.count(),
      quantidadeAntes,
      'Vínculo inválido não cria conta',
    );
    const lista = (mes: string) => service.listar(uid, mes);
    assert.equal(
      (await lista('2030-01')).some((c) => c.id === recorrente.id),
      true,
    );
    assert.deepEqual(
      (await lista('2030-01')).find((c) => c.id === recorrente.id)!
        .formaPagamento,
      { id: forma.id, nome: 'Pix' },
    );
    assert.equal(
      (await lista('2026-10')).some((c) => c.id === unica.id),
      false,
    );
    assert.equal(
      (await lista('2026-11')).some((c) => c.id === unica.id),
      true,
    );
    assert.equal(
      (await lista('2026-12')).some((c) => c.id === unica.id),
      false,
    );
    for (const [mes, numero] of [
      ['2026-12', 1],
      ['2027-01', 2],
      ['2027-02', 3],
    ] as const) {
      const conta = (await lista(mes)).find((c) => c.id === parcelada.id)!;
      assert.equal(conta.parcelaAtual, numero);
      assert.equal(conta.valor.toString(), '75.5');
      assert.deepEqual(conta.formaPagamento, { id: forma.id, nome: 'Pix' });
    }
    assert.equal(
      (await lista('2026-11')).some((c) => c.id === parcelada.id),
      false,
    );
    assert.equal(
      (await lista('2027-03')).some((c) => c.id === parcelada.id),
      false,
    );
    const antes = await prisma.conta.count();
    await lista('2030-01');
    await lista('2031-01');
    assert.equal(
      await prisma.conta.count(),
      antes,
      'Listar não materializa nem duplica contas',
    );

    await service.pagar(uid, recorrente.id, '2026-10');
    assert.equal(
      (await lista('2026-10')).find((c) => c.id === recorrente.id)!.pago,
      true,
    );
    assert.equal(
      (await lista('2026-11')).find((c) => c.id === recorrente.id)!.pago,
      false,
    );
    const pagamentos = await Promise.allSettled([
      service.pagar(uid, recorrente.id, '2026-11'),
      service.pagar(uid, recorrente.id, '2026-11'),
    ]);
    assert.equal(pagamentos.filter((p) => p.status === 'fulfilled').length, 1);
    const rejeitado = pagamentos.find((p) => p.status === 'rejected');
    assert.ok(
      rejeitado?.status === 'rejected' &&
        rejeitado.reason instanceof ConflictException,
    );
    await service.pagar(uid, parcelada.id, '2027-01');
    assert.equal(
      (await lista('2027-01')).find((c) => c.id === parcelada.id)!.pago,
      true,
    );
    assert.equal(
      (await lista('2026-12')).find((c) => c.id === parcelada.id)!.pago,
      false,
    );
    assert.equal(
      (await lista('2027-02')).find((c) => c.id === parcelada.id)!.pago,
      false,
    );
    await assert.rejects(
      service.pagar(uid, parcelada.id, '2027-03'),
      NotFoundException,
    );
    await assert.rejects(
      service.pagar(uid, parcelada.id, '2026-11'),
      NotFoundException,
    );
    await assert.rejects(
      service.pagar(uid, unica.id, '2026-12'),
      NotFoundException,
    );
    assert.deepEqual(await service.listar(uid + 1000, '2026-10'), []);
    const pagamentoAntesDaTroca = (await lista('2026-10')).find(
      (c) => c.id === recorrente.id,
    )!.dataHoraPagamento;
    const vinculoAlterado = await service.alterarFormaPagamento(
      uid,
      recorrente.id,
      { formaPagamentoId: outraForma.id },
    );
    assert.deepEqual(vinculoAlterado, {
      id: recorrente.id,
      formaPagamentoId: outraForma.id,
      formaPagamento: { id: outraForma.id, nome: outraForma.nome },
    });
    assert.equal(
      (await lista('2030-01')).find((c) => c.id === recorrente.id)!
        .formaPagamentoId,
      outraForma.id,
    );
    assert.equal(
      (await lista('2026-10'))
        .find((c) => c.id === recorrente.id)!
        .dataHoraPagamento?.toISOString(),
      pagamentoAntesDaTroca?.toISOString(),
    );
    assert.equal(
      (await lista('2027-01')).find((c) => c.id === parcelada.id)!
        .formaPagamentoId,
      forma.id,
    );
    for (const formaPagamentoId of [formaAlheia.id, randomUUID()]) {
      await assert.rejects(
        service.alterarFormaPagamento(uid, recorrente.id, { formaPagamentoId }),
        NotFoundException,
      );
      assert.equal(
        (await lista('2026-10')).find((c) => c.id === recorrente.id)!
          .formaPagamentoId,
        outraForma.id,
      );
    }
    for (const formaPagamentoId of [forma.id, null]) {
      await assert.rejects(
        service.alterarFormaPagamento(outroUsuario.id, recorrente.id, {
          formaPagamentoId,
        }),
        NotFoundException,
      );
    }
    await assert.rejects(
      service.alterarFormaPagamento(uid, randomUUID(), {
        formaPagamentoId: forma.id,
      }),
      NotFoundException,
    );
    const vinculoRemovido = await service.alterarFormaPagamento(
      uid,
      recorrente.id,
      { formaPagamentoId: null },
    );
    assert.deepEqual(vinculoRemovido, {
      id: recorrente.id,
      formaPagamentoId: null,
      formaPagamento: null,
    });
    assert.equal(
      (await lista('2026-10')).find((c) => c.id === recorrente.id)!.pago,
      true,
    );
    assert.equal(
      (await lista('2030-01')).find((c) => c.id === recorrente.id)!
        .formaPagamento,
      null,
    );
    await service.alterarFormaPagamento(uid, recorrente.id, {
      formaPagamentoId: null,
    });
    await service.alterarFormaPagamento(uid, recorrente.id, {
      formaPagamentoId: forma.id,
    });
    await assert.rejects(
      service.pagar(uid + 1000, recorrente.id, '2026-10'),
      NotFoundException,
    );
    await assert.rejects(
      service.excluir(uid + 1000, recorrente.id),
      NotFoundException,
    );
    await prisma.formaPagamento.update({
      where: { id: forma.id },
      data: { nome: 'Pix pessoal' },
    });
    assert.deepEqual(
      (await lista('2026-10')).find((c) => c.id === recorrente.id)!
        .formaPagamento,
      { id: forma.id, nome: 'Pix pessoal' },
    );
    const contasAntesDeExcluirForma = await prisma.conta.count();
    await prisma.formaPagamento.delete({ where: { id: forma.id } });
    assert.equal(await prisma.conta.count(), contasAntesDeExcluirForma);
    const semForma = (await lista('2026-10')).find(
      (c) => c.id === recorrente.id,
    )!;
    assert.equal(semForma.formaPagamentoId, null);
    assert.equal(semForma.formaPagamento, null);
    assert.equal(
      semForma.pago,
      true,
      'Excluir forma mantém o pagamento da conta',
    );
    await service.excluir(uid, recorrente.id);
    assert.equal(
      await prisma.contaPagamento.count({ where: { contaId: recorrente.id } }),
      0,
    );
    console.log(
      'OK: migração legada, meses, pagamentos concorrentes, troca e remoção de forma, isolamento e exclusão sem perda de contas.',
    );
  } finally {
    await prisma?.onModuleDestroy();
    await db?.end();
    if (criado && /^financas_monthly_test_\d+$/.test(nomeBanco)) {
      // O único alvo de exclusão é o banco temporário criado por este teste.
      await admin.query(`DROP DATABASE "${nomeBanco}" WITH (FORCE)`);
    }
    await admin.end();
    process.env.DATABASE_URL = originalUrl;
  }
}

void main().catch((erro: unknown) => {
  console.error(
    erro instanceof Error ? erro.message : 'Falha na integração mensal',
  );
  process.exitCode = 1;
});
