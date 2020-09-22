import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import Category from './Category';

@Entity('transactions')
class Transaction {
  // Coluna Id
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Coluna do título da Transação
  @Column()
  title: string;

  // Coluna do tipo da Transação
  @Column()
  type: 'income' | 'outcome';

  // Coluna do valor da Transação
  @Column('decimal')
  value: number;

  @Column()
  category_id: string;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default Transaction;
