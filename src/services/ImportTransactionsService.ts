import { getRepository, getCustomRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransactions {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const contactsReadStream = fs.createReadStream(filePath);

    const parsers = csvParse({
      from_line: 2,
    });

    const parseCSV = contactsReadStream.pipe(parsers);

    const transactions: CSVTransactions[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    // Buscando todas as categorias do banco de dados:
    const existentCategories = await categoriesRepository.find({
      where: In(categories),
    });

    // Filtrando as categorias apenas pelo 'title' e retornando-as em um Array:
    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    // Adicionando as categorias que não existem no banco de dados e filtrando as categorias duplicadas:
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    // Salvando as novas Categorias
    await categoriesRepository.save(newCategories);

    // 'finalCategories' é composto por um Array de novas categorias (que forma criadas) + as categorias já existentes (do banco de dados):
    const finalCategories = [...newCategories, ...existentCategories];

    // Criando as transações que importamos para que sejam armazenadas no banco de dados:
    const createdTransactions = transactionsRepository.create(
      // Mapeamos o Array de transações que instanciamos temporariamente aqui no serviço:
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        // A categoria do arquivo importado é na verdade a filtragem do Array 'finalCategories' na qual estamos procurando pelo mesmo título:
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
