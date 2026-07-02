"""add chat threads/messages and knowledge documents

Revision ID: b1f4c2a7d9e3
Revises: 06ee783311fa
Create Date: 2026-07-02 12:00:00.000000

Adds the Copilot chat tables (chat_threads, chat_messages) and the RAG
knowledge corpus (knowledge_documents).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1f4c2a7d9e3'
down_revision: Union[str, Sequence[str], None] = '06ee783311fa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'chat_threads',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('ticket_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ['ticket_id'], ['tickets.id'],
            name=op.f('fk_chat_threads_ticket_id_tickets'),
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_chat_threads')),
    )
    op.create_index('uq_chat_threads_ticket', 'chat_threads', ['ticket_id'], unique=True)

    op.create_table(
        'chat_messages',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('thread_id', sa.UUID(), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('model', sa.String(length=100), nullable=True),
        sa.Column('input_tokens', sa.Integer(), nullable=True),
        sa.Column('output_tokens', sa.Integer(), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("role IN ('user', 'assistant')", name=op.f('ck_chat_messages_role')),
        sa.ForeignKeyConstraint(
            ['thread_id'], ['chat_threads.id'],
            name=op.f('fk_chat_messages_thread_id_chat_threads'),
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_chat_messages')),
    )
    op.create_index('idx_chat_messages_thread', 'chat_messages', ['thread_id', 'created_at'], unique=False)

    op.create_table(
        'knowledge_documents',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('namespace', sa.String(length=255), server_default=sa.text("'default'"), nullable=False),
        sa.Column('name', sa.String(length=500), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_knowledge_documents')),
    )
    op.create_index('idx_knowledge_documents_namespace', 'knowledge_documents', ['namespace', 'created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_knowledge_documents_namespace', table_name='knowledge_documents')
    op.drop_table('knowledge_documents')

    op.drop_index('idx_chat_messages_thread', table_name='chat_messages')
    op.drop_table('chat_messages')

    op.drop_index('uq_chat_threads_ticket', table_name='chat_threads')
    op.drop_table('chat_threads')
