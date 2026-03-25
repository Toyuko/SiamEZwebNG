-- DropForeignKey
ALTER TABLE `Document` DROP FOREIGN KEY `Document_case_id_fkey`;

-- AlterTable
ALTER TABLE `Document` MODIFY `case_id` VARCHAR(191) NULL;

-- AddForeignKey (unlink from case on case delete instead of deleting documents)
ALTER TABLE `Document` ADD CONSTRAINT `Document_case_id_fkey` FOREIGN KEY (`case_id`) REFERENCES `Case`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
