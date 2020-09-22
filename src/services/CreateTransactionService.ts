import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface RequestTransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: RequestTransaction): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    const { total } = await transactionsRepository.getBalance();

    if (type === 'outcome' && total < value) {
      throw new AppError('You dont have enough Balance');
    }

    // Buscando Categoria no banco de dados:
    let transactionCategory = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    // Se nao encontrar a categoria, entao ela será criada como uma nova categoria no banco de dados:
    if (!transactionCategory) {
      transactionCategory = categoryRepository.create({
        title: category,
      });

      // Esperamos a categoria ser salva no banco de dados:
      await categoryRepository.save(transactionCategory);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category: transactionCategory,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
