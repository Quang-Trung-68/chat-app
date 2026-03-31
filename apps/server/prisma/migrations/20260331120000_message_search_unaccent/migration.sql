-- Tìm kiếm không phân biệt dấu (dùng trong WHERE position(unaccent(...)))
-- Lưu ý: không tạo index trên biểu thức unaccent() vì hàm không được đánh dấu IMMUTABLE trong một số bản Postgres.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
