import { createDatabasePool } from "../lib/database";

export async function mutateNeonMessage(input: {
  senderId: string; role: string; conversationId: string; messageId: string; text?: string;
}) {
  const pool = createDatabasePool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const found = await client.query(
      `select * from messages where conversation_id=$1 and
       (id::text=$2 or client_message_id=$2) for update`,
      [input.conversationId, input.messageId],
    );
    const message = found.rows[0];
    if (!message || (input.role === "client" && message.sender_id !== input.senderId)) {
      await client.query("rollback");
      return { success: false, error: "Message not found or access denied" };
    }
    let updated;
    if (input.text !== undefined) {
      const result = await client.query(
        "update messages set text=$2, edited_at=now(), updated_at=now() where id=$1 returning *",
        [message.id, input.text],
      );
      updated = { ...result.rows[0], content: input.text };
    } else {
      await client.query("delete from messages where id=$1", [message.id]);
    }
    await client.query(`update conversations set
      last_message_id=m.id, last_message_text=m.text, last_message_at=m.created_at,
      last_message_sender_id=m.sender_id, updated_at=now()
      from (select id,text,created_at,sender_id from messages where conversation_id=$1
            order by created_at desc,id desc limit 1) m where conversations.id=$1`, [input.conversationId]);
    await client.query(`update conversations set last_message_id=null,last_message_text=null,
      last_message_at=null,last_message_sender_id=null where id=$1
      and not exists(select 1 from messages where conversation_id=$1)`, [input.conversationId]);
    await client.query("commit");
    return { success: true, message: updated };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally { client.release(); await pool.end(); }
}

export async function markNeonMessagesSeen(conversationId: string, role: string) {
  const pool = createDatabasePool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`update messages set status='seen',seen_at=now()
      where conversation_id=$1 and seen_at is null and
      (($2='client' and sender_role<>'client') or ($2<>'client' and sender_role='client'))`, [conversationId, role]);
    const result = await client.query(role === "client"
      ? "update conversations set client_unread_count=0 where id=$1 returning *"
      : "update conversations set admin_unread_count=0 where id=$1 returning *", [conversationId]);
    await client.query("commit");
    return result.rows[0] || null;
  } catch (error) {
    await client.query("rollback"); throw error;
  } finally { client.release(); await pool.end(); }
}
